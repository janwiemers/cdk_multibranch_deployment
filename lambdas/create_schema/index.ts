import * as mysql from "mysql2/promise";
import * as AWS from "aws-sdk"

interface Credentials {
  host: string
  port: number,
  username: string,
  password: string,
  dbname: string
}

const secretsClient = new AWS.SecretsManager({
  region: process.env.REGION || "eu-central-1"
});

export async function handler() {
  const dbRootCredentials = await getSecret(process.env.DB_ROOT_CREDENTIALS_ARN!)
  const dbFeatureCredentials = await getSecret(process.env.DB_FEATURE_CREDENTIALS_ARN!)
  const connectionConfig = {
    host: dbRootCredentials.host,
    port: dbRootCredentials.port,
    user: dbRootCredentials.username,
    password: dbRootCredentials.password,
    database: dbRootCredentials.dbname,
  }
  const connection = await mysql.createConnection(connectionConfig);  
  const encryptedPassword = dbFeatureCredentials.password
  const createSchema = `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME} DEFAULT CHARACTER SET = 'utf8' DEFAULT COLLATE 'utf8_general_ci';`
  const createUser = `CREATE USER IF NOT EXISTS '${dbFeatureCredentials.username}'@'%' IDENTIFIED WITH mysql_native_password BY '${encryptedPassword}';`
  const grantPriviledges = `GRANT ALL PRIVILEGES ON ${process.env.DB_NAME}.* TO '${dbFeatureCredentials.username}'@'%';`
  const flushPriviledges = `FLUSH PRIVILEGES;`

  try {
    await connection.execute(createSchema)
    await connection.execute(createUser)
    await connection.execute(grantPriviledges)
    await connection.execute(flushPriviledges)
    return {
      statusCode: 200,
      body: ""
    }
  } catch(e) {
    console.error("Error Message:", )
    throw(e)
  }
}

async function getSecret(arn: string): Promise<Credentials> {
  const secret = await secretsClient.getSecretValue({ SecretId: arn }).promise()
  return JSON.parse(secret.SecretString!) as Credentials
}
