---
title: 3. Build the sample application
---

Build the sample application
============================

The sample app comes prebaked with this repository. It is included in the `/app` folder.
Now that we have the `shared` stack and the Elastic container registry we can build and push the image to that registry so we can use it to deploy our sample application.

1. First locate the docker push commands in the console

![Docker Push Command Button](/assets/docker_push_1.png)

![Docker Push Command Dialog](/assets/docker_push_2.png)

Depending on your CPU architecture you might need to `xbuild` in docker or use [finch](https://github.com/runfinch/finch) which is a replacement tool for docker desktop and provides you with cross OS and Architecture builds.