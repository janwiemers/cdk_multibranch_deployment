---
title: 2. Shared Stack
---

Shared Stack
=============

![Shared Stack](/assets/shared.png)

The shared stack will include anything that will be reused between the different `feature` branches. It is meant to act as the baseline both in terms of components as well as a foundation for security.

In this module we're going to setup different `L2 Constructs` and prepare them to be reused across the different `features`.

## Preparing the class structure

The class provides a few properties that can be read from the outside. This is so that the feature branches can reuse those properties.

```ts
export class Shared extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly registry: ecr.Repository;
  public readonly alb: elb.ApplicationLoadBalancer;
  public readonly albListener: elb.ApplicationListener;
  public readonly dbCluster: rds.ServerlessCluster;
  public readonly secret: rds.DatabaseSecret;
  public readonly sg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // your code lives here :)
  }
}
```

## ECS Cluster & VPC

In order to provision a VPC and the Elastic Compute Service cluster we're making use of a `L2 Construct` that will build that VPC for us. You can also provide a VPC of the type `cdk.aws_ec2.IVpc` if you want to bring your own VPC.

```ts
this.cluster = new ecs.Cluster(this, "cluster", {
  clusterName: "c24-reisen-testing-cluster",
  enableFargateCapacityProviders: true,
})
```

## Elastic Container Registry

Now we're going to prepare the container registry where we can store the container images and pull them into the Elastic Compute Service (ECS) - Service.

More Information on how to push/pull images to/from ECR [https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html)

```ts
this.registry = new ecr.Repository(this, "docker-registry", {
  repositoryName: "c24-reisen-testing-docker-registry",
  encryption: ecr.RepositoryEncryption.AES_256,
  removalPolicy: cdk.RemovalPolicy.DESTROY
})
```

## Database

Next we're going to setup a aurora database which is mysql compliant. We first create a user with a secret in the `Secrets Manager` and afterwards adding the `secret ARN` to the RDS instance during setup. This will define the root user of the Database System.

```ts
const username = "clusteradmin";
this.secret = new rds.DatabaseSecret(this, 'databasesecret', {
  username: username,
});

this.dbCluster = new rds.ServerlessCluster(this, 'database cluster', {
  engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
  vpc: this.cluster.vpc,
  vpcSubnets: this.cluster.vpc.selectSubnets(),
  credentials: rds.Credentials.fromSecret(this.secret, username),
  clusterIdentifier: 'check24-reisen-testing-system',
  defaultDatabaseName: 'none',
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  scaling: {
    minCapacity: 2,
    maxCapacity: 32,
  }
});
```

## Cleanup Webhook

This section will handle the infrastructure setup that will allow feature to be cleaned up after its done.
We will create a `IAM User` a `Lambda function` as well as a security group to enable this webhook.

### IAM User

This user is needed for the authentication to the lambda function url.

```ts
const userName = "check24-reisen-testing-system-cleanup-user"
const user = new iam.User(this, "cleanup-user", {
  userName: userName,
})
const accessKey = new iam.CfnAccessKey(this, 'myAccessKey', {
  userName: user.userName
})
```

### Security group

The security group is used to provide the lambda access to the database.

```ts
this.sg = new ec2.SecurityGroup(this, "lambda-security-group", {
  securityGroupName: "create-schema-sg",
  vpc: this.cluster.vpc,
  allowAllOutbound: true,
})
```

### Lambda function

This function will take care of deleting the feature stack. The code for the lambda is included in the github repo

```ts
const cleanupFunction = new lambda.Function(this, 'cleanup', {
  functionName: "check24-testing-system-cleanup",
  runtime: lambda.Runtime.NODEJS_18_X,
  architecture: lambda.Architecture.ARM_64,
  handler: 'index.handler',
  vpc: this.cluster.vpc,
  securityGroups: [
    this.sg
  ],
  code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambdas', 'cleanup'), {
    exclude: ["*.ts", "*.json"]
  }),
  environment: {
    "DB_ROOT_CREDENTIALS_ARN": this.secret.secretArn,
  }
})

const lambdaUrl = cleanupFunction.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.AWS_IAM,
});
```

### Adding IAM rights

Here we're going to add IAM rights and glue all the standalone services together as one architecture

```ts
const cfDeleteStack = new iam.PolicyStatement({
  actions: [ "cloudformation:DeleteStack" ],
  resources: [ "*" ],
});

cleanupFunction.role?.attachInlinePolicy(new iam.Policy(this, "cf-delete-stack-attachement", {
  statements: [cfDeleteStack],
}))

lambdaUrl.grantInvokeUrl(user)

this.secret.grantRead(cleanupFunction)
```

## Outputs and variables

At last we want some information from our stack as outputs. To get those we can use `cdk.CfnOutput`

```ts
new cdk.CfnOutput(this, 'DB Credentials ARN', { value: this.secret.secretArn });
new cdk.CfnOutput(this, 'DB Cluster ARN', { value: this.dbCluster.clusterArn });
new cdk.CfnOutput(this, 'cleanup url', { value: lambdaUrl.url });
new cdk.CfnOutput(this, 'accessKeyId', { value: accessKey.ref });
new cdk.CfnOutput(this, 'secretAccessKey', { value: accessKey.attrSecretAccessKey });
```

## Deployment

```sh
npm run build && npx cdk deploy shared
```