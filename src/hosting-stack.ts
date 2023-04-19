import { Construct } from "constructs";
import { Duration, Stack } from "aws-cdk-lib";
import {AaaaRecord, ARecord, CnameRecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import {
    AllowedMethods,
    CachePolicy,
    Distribution,
    FunctionCode,
    Function as CFFunction,
    HeadersFrameOption,
    HeadersReferrerPolicy,
    HttpVersion,
    PriceClass,
    ResponseHeadersPolicy,
    SecurityPolicyProtocol,
    ViewerProtocolPolicy,
    FunctionEventType, IOriginAccessIdentity, IDistribution
} from "aws-cdk-lib/aws-cloudfront";
import { IBucket} from "aws-cdk-lib/aws-s3";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { resolve } from "node:path";

import MinimalPropsStack from "./minimal-props-stack";

type CurrentStackProps = MinimalPropsStack & {
    hostedZoneId: string;
    zoneName: string;

    domainName: string;

    originBucket: IBucket;
    originBucketRegion: string;
    originAccessIdentity: IOriginAccessIdentity;
    originPath: string;

    isHidden: boolean;
};

export class HostingStack extends Stack {
    constructor(scope: Construct, id: string, props: CurrentStackProps) {
        super(scope, id, props);

        const hostedZone = HostedZone.fromHostedZoneAttributes(this, `${props.project}-zone`, {
            hostedZoneId: props.hostedZoneId,
            zoneName: props.zoneName
        });

        const certificate = new Certificate(this, `${props.project}-certificate`, {
            domainName: props.domainName,
            subjectAlternativeNames: [
                `www.${props.domainName}`,
                `ww.${props.domainName}`,
                `w.${props.domainName}`
            ],
            validation: CertificateValidation.fromDns(hostedZone)
        });

        const cf_fn_viewer_request = new CFFunction(this, `${props.project}-cf-fn-viewer-request`, {
            code: FunctionCode.fromFile({
                filePath: resolve("./src/cf-fn-viewer-request.js")
            }),
            comment: `Viewer request cloudfront function for redirections (${props.project})`
        });

        const responseHeadersPolicy = new ResponseHeadersPolicy(this, `${props.project}-response-headers-policy`, {
            securityHeadersBehavior: {
                frameOptions: {
                    frameOption: HeadersFrameOption.SAMEORIGIN,
                    override: true
                },
                referrerPolicy: {
                    override: true,
                    referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                },
                xssProtection: {
                    protection: true,
                    modeBlock: true,
                    override: true
                }
            }
        });

        let distribution: IDistribution;

        if (props.isHidden) {
            distribution = new Distribution(this, `${props.project}-distribution-dev`, {
                comment: `${props.project}-distribution-dev`,
                httpVersion: HttpVersion.HTTP2_AND_3,
                enableIpv6: false,
                priceClass: PriceClass.PRICE_CLASS_100,
                certificate,
                minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
                enableLogging: false,
                enabled: true,
                errorResponses: [
                    {
                        ttl: Duration.seconds(0),
                        httpStatus: 400
                    }
                ],
                domainNames: [
                    props.domainName,
                    `w.${props.domainName}`,
                    `ww.${props.domainName}`,
                    `www.${props.domainName}`
                ],
                defaultBehavior: {
                    allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    cachePolicy: new CachePolicy(this, `${props.project}-cache-policy-dev`, {
                        defaultTtl: Duration.seconds(30),
                        maxTtl: Duration.minutes(1),
                        minTtl: Duration.seconds(1),
                        enableAcceptEncodingBrotli: true,
                        enableAcceptEncodingGzip: true
                    }),
                    responseHeadersPolicy,
                    compress: true,
                    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin: new S3Origin(props.originBucket, {
                        originAccessIdentity: props.originAccessIdentity,
                        originShieldRegion: props.originBucketRegion,
                        originPath: props.originPath
                    }),
                    // CloudFront Functions
                    functionAssociations: [
                        {
                            function: cf_fn_viewer_request,
                            eventType: FunctionEventType.VIEWER_REQUEST
                        }
                    ]
                }
            });
        } else {
            distribution = new Distribution(this, `${props.project}-distribution-prod`, {
                comment: `${props.project} Prod`,
                httpVersion: HttpVersion.HTTP2_AND_3,
                enableIpv6: true,
                priceClass: PriceClass.PRICE_CLASS_ALL,
                certificate,
                minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
                enableLogging: false,
                enabled: true,
                errorResponses: [
                    {
                        ttl: Duration.seconds(0),
                        httpStatus: 400
                    }
                ],
                domainNames: [
                    props.domainName,
                    `w.${props.domainName}`,
                    `ww.${props.domainName}`,
                    `www.${props.domainName}`
                ],
                defaultBehavior: {
                    allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    cachePolicy: CachePolicy.CACHING_OPTIMIZED,
                    responseHeadersPolicy,
                    compress: true,
                    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin: new S3Origin(props.originBucket, {
                        originAccessIdentity: props.originAccessIdentity,
                        originShieldRegion: props.originBucketRegion,
                        originPath: props.originPath
                    }),
                    // CloudFront Functions
                    functionAssociations: [
                        {
                            function: cf_fn_viewer_request,
                            eventType: FunctionEventType.VIEWER_REQUEST
                        }
                    ]
                }
            });
        }

        new ARecord(this, `${props.project}-record-a`, {
            recordName: props.domainName,
            zone: hostedZone,
            target: RecordTarget.fromAlias(new CloudFrontTarget(distribution))
        });

        if (!props.isHidden) {
            new AaaaRecord(this, `${props.project}-record-aaaa`, {
                recordName: props.domainName,
                zone: hostedZone,
                target: RecordTarget.fromAlias(new CloudFrontTarget(distribution))
            });
        }

        new CnameRecord(this, `${props.project}-record-cname-www`, {
            recordName: `www.${props.domainName}`,
            zone: hostedZone,
            domainName: props.domainName
        });

        new CnameRecord(this, `${props.project}-record-cname-ww`, {
            recordName: `ww.${props.domainName}`,
            zone: hostedZone,
            domainName: props.domainName
        });

        new CnameRecord(this, `${props.project}-record-cname-w`, {
            recordName: `w.${props.domainName}`,
            zone: hostedZone,
            domainName: props.domainName
        });
    }
}
