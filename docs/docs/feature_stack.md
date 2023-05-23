---
title: 4. Feature Stack
---

Feature Stack
=============

![Feature Stack](/assets/feature.png)

In this module we're going to setup the `feature` part of this workshop. This part will be responsible to deploy the components needed for each individual feature branch.

## Preparing the class structure

This class takes a different `props` argument compared to a regular `cdk.Stack`. This will allow the stack to get the information needed from the `shared` stack in order to build and parameterize the `feature` infrastructure.

```ts

export interface FeatureStackProps extends cdk.StackProps {
  cluster: ecs.Cluster,
  registry: ecr.Repository,
  dbCluster: rds.ServerlessCluster,
  featureName: string,
  containerTag: string,
  secret: rds.DatabaseSecret,
  sg: ec2.SecurityGroup
}

export class Feature extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FeatureStackProps) {
    super(scope, id, props);

    // Your code lives here again :)
  }

  private sanatize(str: string): string {
    return str.replaceAll("-", "_")
  }
}

```

## Tagging & cost control

In order to manage and maintain an overview of costs and deployed resources per `feature` we're going to a some tags to all components associated with the `stack`

```ts
cdk.Tags.of(scope).add(`Feature/${props.featureName}`, "true")
cdk.Tags.of(scope).add("Program", "Check24_testing_system")
```

## Prepare feature database

Each feature requires its own database. To create that database we're going to make use of a `Lambda function` that will create the Schema and user for the current feature.

{% info %}
This would be the place where you can restore sql dumps or do more custom logic around seeding and migrations.
{% end %}

```ts
const sanatizedFeatureName = this.sanatize(props.featureName)
const dbName = `database_${sanatizedFeatureName}`
const dbUser = `user_${sanatizedFeatureName}`

// create a new secret for the feature db
const secret = new rds.DatabaseSecret(this, 'databasesecret', {
  username: dbUser,
});

const trigger = new triggers.TriggerFunction(this, 'createSchema', {
  timeout: cdk.Duration.seconds(20),
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, "..", "lambdas", "create_schema"), {
    exclude: ["*.ts", "*.json"]
  }),
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

// allow reading the secret to the lambda function
secret.grantRead(trigger)
props.secret.grantRead(trigger)
```

## ECS Service & Application Loadbalancer

Now that we have all the building block we can get the pieces together and use the `L3 Construct` called `ApplicationLoadBalancedFargateService`. This opinionated Construct will create the service and taskdefinitions in ECS. It will also create the `ALB` and `Target Group` as well as the required `Security Groups` to allow the traffic flow from the ALB to the ECS Service. 

```ts
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

// Allow the task role to read the db secret
secret.grantRead(service.taskDefinition.taskRole)
```

### Outputs

As we did with the `shared` stack we need some outputs in oder to work with the branch.

```ts
new cdk.CfnOutput(this, 'db feature credentials arn', { value: secret.secretArn });
new cdk.CfnOutput(this, 'db schema', { value: dbName });
new cdk.CfnOutput(this, 'Endpoint', { value: service.loadBalancer.loadBalancerDnsName });
```

## Deploying the feature

To deploy the feature we're again using the `CDK CLI` and add a few parameters.

```sh
npm run build && \
  npx cdk deploy feature \
  --context stackName={ YOUR FEATURE NAME } \
  --context containerTag={ YOUR CONTAINER TAG }
```

![CloudFormation Stack](/assets/cloudformation_stack.png)

## Destroy the feature

Now that we've deployed the feature and have been able to play around with it let's clean it up and delete the stack again.

```sh
awscurl \
  --service lambda \
  --region eu-central-1 \
  --access_key { YOUR ACCESS KEY } \
  --secret_key { YOUR SECRET KEY } \
  https://{YOUR LAMBDA FUNCTION ID}.lambda-url.eu-central-1.on.aws/\?stackName\={ YOUR FEATURE NAME }
```