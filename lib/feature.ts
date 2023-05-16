import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as triggers from 'aws-cdk-lib/triggers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from "path";

export interface FeatureStackProps extends cdk.StackProps {
  cluster: ecs.Cluster,
  registry: ecr.Repository,
  dbCluster: rds.ServerlessCluster,
  featureName: string,
  containerTag: string,
  createSchema: lambda.Function,
  secret: rds.DatabaseSecret,
  sg: ec2.SecurityGroup
}

export class Feature extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FeatureStackProps) {
    super(scope, id, props);

    cdk.Tags.of(scope).add(`Feature/${props.featureName}`, "true")
    cdk.Tags.of(scope).add("Program", "Check24_testing_system")

    const sanatizedFeatureName = this.sanatize(props.featureName)
    const dbName = `database_${sanatizedFeatureName}`
    const dbUser = `user_${sanatizedFeatureName}`
    const secret = new rds.DatabaseSecret(this, 'databasesecret', {
      username: dbUser,
    });

    const trigger = new triggers.TriggerFunction(this, 'createSchema', {
      timeout: cdk.Duration.seconds(20),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, "..", "lambdas", "create_schema")),
      architecture: lambda.Architecture.ARM_64,
      securityGroups: [
        props.sg
      ],
      vpc: props.cluster.vpc,
      environment: {
        "DB_NAME": dbName,
        "DB_FEATURE_CREDENTIALS_ARN": secret.secretArn,
        "DB_ROOT_CREDENTIALS_ARN": props.secret.secretArn,
      }
    });

    secret.grantRead(trigger)
    props.secret.grantRead(trigger)

    new cdk.CfnOutput(this, 'db feature credentials arn', { 
      value: secret.secretArn
    });

    new cdk.CfnOutput(this, 'db schema', { 
      value: dbName
    });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "fargate-service", {
      serviceName: props.featureName,
      loadBalancerName: props.featureName,
      cluster: props.cluster,
      publicLoadBalancer: true,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      },
      desiredCount: 1,
      cpu: 256,
      memoryLimitMiB: 512,
      targetProtocol: elb.ApplicationProtocol.HTTP,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(props.registry, props.containerTag),
        environment: {
          FEATURE_NAME: props.featureName,
          DB_NAME: dbName,
          DB_HOST: props.dbCluster.clusterEndpoint.hostname,
          DB_PORT: props.dbCluster.clusterEndpoint.port.toString(),
          DB_FEATURE_SECRET_ARN: secret.secretArn,
        }
        
      },
    })

    secret.grantRead(service.taskDefinition.taskRole)

    new cdk.CfnOutput(this, 'Endpoint', { 
      value: service.loadBalancer.loadBalancerDnsName
    });
  }

  private sanatize(str: string): string {
    return str.replaceAll("-", "_")
  }
}