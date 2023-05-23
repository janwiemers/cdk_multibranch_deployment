---
title: Utilities
---

Utilities
=============

## AWSCURL

AWSCURL is a commandline tool that you can use to sign requests that require IAM permissions like the Lambda function URL for example.

[https://github.com/okigan/awscurl](https://github.com/okigan/awscurl)

### Installation

```sh
brew install awscurl
```

### Usage

```sh
awscurl --service lambda \
  --region eu-central-1 \
  --access_key { The IAM Users Accesskey }\
  --secret_key { The IAM Users Secret Key }\
  https://{your lambda function url id}.lambda-url.eu-central-1.on.aws/\?stackName\={feature name}
```

## finch

Is a commandline tool to build open container images and can replace docker desktop.

[https://github.com/runfinch/finch](https://github.com/runfinch/finch)

### Installation

```sh
brew install --cask finch
```

### Setup

```sh
finch vm init
echo "alias docker=\"finch\"" >> ~/.zshrc
source ~/.zshrc
```

### Usage

dockerlike :)