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
  secret: rds.DatabaseSecret,
  sg: ec2.SecurityGroup
}

export class Feature extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FeatureStackProps) {
    super(scope, id, props);

    // Your code goes here :)
  }

  private sanatize(str: string): string {
    return str.replaceAll("-", "_")
  }
}