import { Construct } from "constructs";
import {RemovalPolicy, Stack} from "aws-cdk-lib";
import {BlockPublicAccess, Bucket, IBucket} from "aws-cdk-lib/aws-s3";
import {IOriginAccessIdentity, OriginAccessIdentity} from "aws-cdk-lib/aws-cloudfront";
import { CfnIPSet, CfnWebACL } from "aws-cdk-lib/aws-wafv2";

import MinimalPropsStack from "./minimal-props-stack";

type CurrentStackProps = MinimalPropsStack & {
    originBucketName: string;
    originBucketRegion: string;
    ipv4CIDRWhiteList: string[];
};

export class CommonStack extends Stack {
    public readonly s3Bucket: IBucket;
    public readonly originAccessIdentity: IOriginAccessIdentity;
    public readonly webAcl: CfnWebACL;

    constructor(scope: Construct, id: string, props: CurrentStackProps) {
        super(scope, id, props);

        this.s3Bucket = new Bucket(this, `${props.project}-origin`, {
            bucketName: props.originBucketName,
            removalPolicy: RemovalPolicy.RETAIN,
            publicReadAccess: false,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL
        });

        this.originAccessIdentity = new OriginAccessIdentity(this, `${props.project}-origin-access-identity`, {
            comment: `${props.project}-origin-access-identity`
        });

        this.s3Bucket.grantRead(this.originAccessIdentity);

        const wafWhiteIPSet = new CfnIPSet(this, `${props.project}-white-ip-set`, {
            addresses: props.ipv4CIDRWhiteList,
            ipAddressVersion: "IPV4",
            scope: "CLOUDFRONT"
        });

        const visibilityConfig: CfnWebACL.VisibilityConfigProperty = {
            metricName: `${props.project}-waf-metric`,
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: false
        };

        this.webAcl = new CfnWebACL(this, `${props.project}-web-acl`, {
            defaultAction: {
                block: {}
            },
            scope: "CLOUDFRONT",
            visibilityConfig,
            rules: [
                {
                    name: `${props.project}-waf-white-ip-set-rule`,
                    priority: 1,
                    action: {
                        allow: {}
                    },
                    statement: {
                        ipSetReferenceStatement: {
                            arn: wafWhiteIPSet.attrArn
                        }
                    },
                    visibilityConfig
                }
            ]
        });
    }
}
