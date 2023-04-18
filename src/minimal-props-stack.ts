import { Environment } from "aws-cdk-lib";

type MinimalPropsStack = {
    project: string;
    env: Environment;
    accountId: string;
};

export default MinimalPropsStack;
