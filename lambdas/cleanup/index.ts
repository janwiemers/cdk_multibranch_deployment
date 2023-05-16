import * as mysql from "mysql2/promise";
import * as AWS from "aws-sdk"

interface Credentials {
  host: string
  port: number,
  username: string,
  password: string,
  dbname: string
}

// Create a Secrets Manager client
const secretsClient = new AWS.SecretsManager({
  region: process.env.REGION || "eu-central-1"
});

const cfClient = new AWS.CloudFormation()

export async function handler(event: any) {
  console.log(event)
  const dbRootCredentials = await getSecret(process.env.DB_ROOT_CREDENTIALS_ARN!)
  const connectionConfig = {
    host: dbRootCredentials.host,
    port: dbRootCredentials.port,
    user: dbRootCredentials.username,
    password: dbRootCredentials.password,
    database: dbRootCredentials.dbname,
  }

  const stackName = event.queryStringParameters.stackName
  const cfStackName = `check24-reisen-feature-${stackName}`
  const dbFeatureName = `database_${sanatize(stackName)}`
  const dbFeatureUser = `user_${sanatize(stackName)}`

  const connection = await mysql.createConnection(connectionConfig); 
  const dropSchema = `DROP DATABASE IF EXISTS ${dbFeatureName};`
  const dropUser = `DROP USER IF EXISTS '${dbFeatureUser}'@'%';`
  try {
    await connection.execute(dropSchema)
    await connection.execute(dropUser)
    await cfClient.deleteStack({
      StackName: cfStackName
    }).promise()
    return {
      statusCode: 200,
      body: ""
    }
  } catch(e) {
    console.error(e)
    return {
      statusCode: 400,
      body: ""
    }
  }
}

function sanatize(str: string): string {
  return str.replaceAll("-", "_")
}

async function getSecret(arn: string): Promise<Credentials> {
  const secret = await secretsClient.getSecretValue({ SecretId: arn }).promise()
  return JSON.parse(secret.SecretString!) as Credentials
}