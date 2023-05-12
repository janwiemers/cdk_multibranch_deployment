.PHONY: default
default: build;

$(CONTAINER_TAG)?=latest

build:
	finch build --platform=arm64 -t c24-reisen-testing-docker-registry .

deploy:
	finch tag c24-reisen-testing-docker-registry:latest 224935473367.dkr.ecr.eu-central-1.amazonaws.com/c24-reisen-testing-docker-registry:$(CONTAINER_TAG)
	aws ecr get-login-password --region eu-central-1 | finch login --username AWS --password-stdin 224935473367.dkr.ecr.eu-central-1.amazonaws.com
	finch push 224935473367.dkr.ecr.eu-central-1.amazonaws.com/c24-reisen-testing-docker-registry:$(CONTAINER_TAG)

run:
	finch run -p 80:80 c24-reisen-testing-docker-registry:latest 


# npm run build && npx cdk deploy feature --context stackName=my-feature containerTag=1 rulePriority=1

# 224935473367.dkr.ecr.eu-central-1.amazonaws.com/c24-reisen-testing-docker-registry