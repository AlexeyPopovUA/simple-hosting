import {name} from "./../package.json";

export default {
    COMMON: {
        accountID: "026090449790",
        project: name,
        defaultRegion: "us-east-1"
    },
    HOSTING_COMMON: {
        s3OriginName: `${name}-examples`,
        s3Region: "us-east-1",
        ipv4CIDRWhiteList: []
    },
    HOSTING_DEV: {
        domain: "dev.simple-hosting.examples.oleksiipopov.com",
        hostedZoneId: "Z1O5PNX51MI59R",
        hostedZoneName: "oleksiipopov.com",
        originPath: "/"
    },
    HOSTING_PROD: {
        domain: "simple-hosting.examples.oleksiipopov.com",
        hostedZoneId: "Z1O5PNX51MI59R",
        hostedZoneName: "oleksiipopov.com",
        originPath: "/main"
    }
};
