# Check24 Testing System – Multibranch deployment

This repository is build as a proof of concept to demonstrate how to deploy multiple branches of a repository for testing purposes. This repository contains all assets required for this POC. 

## Deployment

In order to deploy the stack you need to follow the next steps

```
npx cdk init
npx cdk deploy shared
cd app
make CONTAINER_TAG={tag or git sha}
make CONTAINER_TAG={tag or git sha} deploy
cd ..
npm run build && npx cdk deploy feature --context stackName={feature name} --context containerTag={tag or git sha}
```

Cleaning up the a branch

```
curl --request GET --url 'https://{function url id}.lambda-url.eu-central-1.on.aws/?stackName={feature name}'
```





