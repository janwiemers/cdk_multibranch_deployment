import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
// import * as r53 from 'aws-cdk-lib/aws-route53';


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

    // Docker Registry
    this.registry = new ecr.Repository(this, "docker-registry", {
      repositoryName: "c24-testing-docker-registry",
      encryption: ecr.RepositoryEncryption.AES_256,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, "cluster", {
      clusterName: "c24-testing-cluster",
      enableFargateCapacityProviders: true,
    })

    // Database cluster
    const username = "clusteradmin";
    this.secret = new rds.DatabaseSecret(this, 'databasesecret', {
      username: username,
    });

    new cdk.CfnOutput(this, 'DB Credentials ARN', { 
      value: this.secret.secretArn,
    });

    this.dbCluster = new rds.ServerlessCluster(this, 'database cluster', {
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      vpc: this.cluster.vpc,
      vpcSubnets: this.cluster.vpc.selectSubnets(),
      credentials: rds.Credentials.fromSecret(this.secret, username),
      clusterIdentifier: 'check24-testing-system',
      defaultDatabaseName: 'none',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      scaling: {
        minCapacity: 2,
        maxCapacity: 32,
        // autoPause: cdk.Duration.minutes(20),
      }
    });

    this.sg = new ec2.SecurityGroup(this, "lambda-security-group", {
      securityGroupName: "create-schema-sg",
      vpc: this.cluster.vpc,
      allowAllOutbound: true,
    })

    // cloudformation:DeleteStack
    const cfDeleteStack = new iam.PolicyStatement({
      actions: [ "cloudformation:DeleteStack" ],
      resources: [ "*" ],
    });

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

    cleanupFunction.role?.attachInlinePolicy(new iam.Policy(this, "cf-delete-stack-attachement", {
      statements: [cfDeleteStack],
    }))

    this.secret.grantRead(cleanupFunction)

    const lambdaUrl = cleanupFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    this.dbCluster.connections.allowFrom(this.sg, ec2.Port.allTraffic())
    this.cluster.vpc.privateSubnets.forEach((subnet: ec2.ISubnet) => {
      this.dbCluster.connections.allowDefaultPortFrom(ec2.Peer.ipv4(subnet.ipv4CidrBlock))
    })

    new cdk.CfnOutput(this, 'DB Cluster ARN', { 
      value: this.dbCluster.clusterArn,
      exportName: "dbClusterARN"
    });

    // create iam user for cleanup
    const userName = "check24-testing-system-cleanup-user"
    const user = new iam.User(this, "cleanup-user", {
      userName: userName,
    })
    const accessKey = new iam.CfnAccessKey(this, 'myAccessKey', {
      userName: user.userName
    })

    lambdaUrl.grantInvokeUrl(user)

    new cdk.CfnOutput(this, 'cleanup url', { value: lambdaUrl.url });
    new cdk.CfnOutput(this, 'accessKeyId', { value: accessKey.ref });
    new cdk.CfnOutput(this, 'secretAccessKey', { value: accessKey.attrSecretAccessKey });
  }
}
