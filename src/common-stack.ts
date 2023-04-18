import { Construct } from "constructs";
import {RemovalPolicy, Stack} from "aws-cdk-lib";
import {BlockPublicAccess, Bucket, IBucket} from "aws-cdk-lib/aws-s3";
import {IOriginAccessIdentity, OriginAccessIdentity} from "aws-cdk-lib/aws-cloudfront";

import MinimalPropsStack from "./minimal-props-stack";

type CurrentStackProps = MinimalPropsStack & {
    originBucketName: string;
    originBucketRegion: string;
};

export class CommonStack extends Stack {
    public s3Bucket: IBucket;
    public originAccessIdentity: IOriginAccessIdentity;

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
    }
}
