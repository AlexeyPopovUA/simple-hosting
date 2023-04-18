import { App } from "aws-cdk-lib";

import { HostingStack } from "./hosting-stack";
import configuration from "./configuration";
import {CommonStack} from "./common-stack";

class Main extends App {
    constructor() {
        super();

        const region = configuration.COMMON.defaultRegion;
        const accountId = configuration.COMMON.accountID;
        const project = configuration.COMMON.project;

        const env = { region };

        const tags = {
            project: project
        };

        const commonParams = {
            project,
            accountId,
            env,
            tags
        };

        const commonStack = new CommonStack(this, `${project}-common`, {
            ...commonParams,

            originBucketName: configuration.HOSTING_COMMON.s3OriginName,
            originBucketRegion: configuration.HOSTING_COMMON.s3Region
        });

        new HostingStack(this, `${project}-prod`, {
            ...commonParams,

            domainName: configuration.HOSTING_PROD.domain,
            hostedZoneId: configuration.HOSTING_PROD.hostedZoneId,
            zoneName: configuration.HOSTING_PROD.hostedZoneName,
            originBucket: commonStack.s3Bucket,
            originBucketRegion: configuration.HOSTING_COMMON.s3Region,
            originAccessIdentity: commonStack.originAccessIdentity,
            originPath: configuration.HOSTING_PROD.originPath,
            isHidden: false
        });

        new HostingStack(this, `${project}-dev`, {
            ...commonParams,

            domainName: configuration.HOSTING_DEV.domain,
            hostedZoneId: configuration.HOSTING_DEV.hostedZoneId,
            zoneName: configuration.HOSTING_DEV.hostedZoneName,
            originBucket: commonStack.s3Bucket,
            originBucketRegion: configuration.HOSTING_COMMON.s3Region,
            originAccessIdentity: commonStack.originAccessIdentity,
            originPath: configuration.HOSTING_DEV.originPath,
            isHidden: true
        });
    }
}

new Main();
