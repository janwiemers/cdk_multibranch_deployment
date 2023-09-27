'use strict';

const express = require('express');
const AWS = require("aws-sdk");
const mysql = require("mysql2/promise");

// Constants
const PORT = 80;
const HOST = '0.0.0.0';

const secretsClient = new AWS.SecretsManager({
  region: process.env.REGION || "eu-central-1"
});


// App
const app = express();
app.get('/', async (req, res) => {
  res.send(process.env.FEATURE_NAME);
});

app.get('/mysql', async (req, res) => {
  const credentials = await getSecret(process.env.DB_FEATURE_SECRET_ARN)
  const connectionConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: credentials.username,
    password: credentials.password,
    database: process.env.DB_NAME,
  }

  try {
    const connection = await mysql.createConnection(connectionConfig); 
    const [rows, fields] = await connection.execute("SHOW TABLES;")
    res.send("Connection successfull");
  } catch(e) {
    const message = connectionConfig
    message.error = e
    res.send(message);
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});

async function getSecret(arn) {
  const secret = await secretsClient.getSecretValue({ SecretId: arn }).promise()
  return JSON.parse(secret.SecretString)
}
