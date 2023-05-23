---
title: 1. Setup
---

Setup
=============

In this chapter we're going to layout the basic structure of the project.
The project should already be setup and initialized if you cloned this repository.

The main files we're going to work in are

```sh
bin/testing_system_workshop.ts
lib/shared.ts
lib/feature.ts
```

![Setup](/assets/setup_1.png)

## Stack setup

Now that we have cloned the repository and familiarized with the target architecture lets start with building out the entry point

```ts
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
// Import the shared stack class
import { Shared } from '../lib/shared';

// Import the feature stack class
import { Feature } from '../lib/feature';

const app = new cdk.App();

// lets get information from teh commandline, it will allow us later to parametrize the feature stacks 
const featureName = app.node.tryGetContext('stackName') || "your-feature"
const containerTag = app.node.tryGetContext('containerTag') || "1"
const stackName = `check24-reisen-feature-${featureName}`

// Lets create a new instance of the shared stack you can reference the stack by the name in "'" (shared)
const shared = new Shared(app, 'shared', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

// Lets create an instance of the feature stack with some custom properties.
// We'll get to that later
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
```
