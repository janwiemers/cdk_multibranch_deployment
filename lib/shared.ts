import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';

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

    // Your code goes here :)
  }
}
