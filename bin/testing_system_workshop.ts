#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Shared } from '../lib/shared';
import { Feature } from '../lib/feature';

const app = new cdk.App();
const featureName = app.node.tryGetContext('stackName') || "your-feature"
const containerTag = app.node.tryGetContext('containerTag') || "1"
const stackName = `check24-reisen-feature-${featureName}`

const shared = new Shared(app, 'shared', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

new Feature(app, 'feature', {
  cluster: shared.cluster,
  registry: shared.registry,
  dbCluster: shared.dbCluster,
  stackName: stackName,
  secret: shared.secret,
  sg: shared.sg,
  featureName,
  containerTag,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth()
