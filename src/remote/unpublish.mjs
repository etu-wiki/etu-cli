import { program } from "commander";
import path from "path";
import fs from "fs";
import os from "os";
import axios from "axios";
import bytes from "bytes";
import {
  cwd,
  __dirname,
  info,
  error,
  bold,
  warning,
  underline,
  getIIIFVersion,
  getImageAPIVersion,
} from "../utils/common.mjs";
import pLimit from "p-limit";

import { CognitoIdentity } from "@aws-sdk/client-cognito-identity";
import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";

import {
  MAX_CONCURRENT,
  COGNITO_CLIENT_ID,
  AWS_REGION,
  IDENTITY_POOL_ID,
  USER_POOL_ID,
  UPLOAD_BUCKET,
  TENANT_TABLE,
  ADMIN_API_ENDPOINT,
} from "../config.mjs";
import yaml from "js-yaml";

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
const dbclient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(dbclient);

const credPath = path.join(os.homedir(), ".etu", ".credentials");
if (!fs.existsSync(credPath)) {
  console.log("Please login first");
  process.exit(1);
}
const credentials = yaml.load(fs.readFileSync(credPath).toString());

// Configure the Cognito client
const cognitoClient = new CognitoIdentity({
  region: AWS_REGION,
});

// Configure the Cognito client
const cognitoProviderClient = new CognitoIdentityProvider({
  region: AWS_REGION,
});

const refreshToken = credentials.token.RefreshToken;
try {
  // Initiate authentication with the refresh token
  const initiateAuthParams = {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  };

  const initiateAuthResponse = await cognitoProviderClient.initiateAuth(
    initiateAuthParams
  );

  const newAccessToken = initiateAuthResponse.AuthenticationResult.AccessToken;
  const newIdToken = initiateAuthResponse.AuthenticationResult.IdToken;

  credentials.token.AccessToken = newAccessToken;
  credentials.token.IdToken = newIdToken;
  fs.writeFileSync(credPath, yaml.dump(credentials));
} catch (error) {
  if (error.message === "Refresh Token has been revoked") {
    console.log("Please login first");
    process.exit(1);
  }
}

const description = `Unpublish your Images to recover ETU IIIF server storage

    Example:
        $ etu publish`;

program.name("etu publish").description(description);

const etuLockYamlPath = path.join(cwd, "etu-lock.yaml");
if (!fs.existsSync(etuLockYamlPath)) {
  console.log(
    error(`No etu-lock.yaml found in ${cwd}  Please run 'etu install' first.`)
  );
  process.exit(1);
}

let images = [];
const etuYaml = yaml.load(fs.readFileSync(etuLockYamlPath).toString());
for (let imagePath of etuYaml.images) {
  for (let file of imagePath.files) {
    const item = JSON.parse(JSON.stringify(file));
    const fileFullPath = path.join(imagePath.path, file.filename);
    item.filepath = fileFullPath;
    item.label = imagePath.label + " " + file.label;
    item.iiifversion = getIIIFVersion(etuYaml.viewer);
    item.imageapiversion = getImageAPIVersion(etuYaml.viewer);
    images.push(item);
  }
}

console.time("unpublish time");

// limit file handlers
const limit = pLimit(MAX_CONCURRENT);

console.log(info("Start unpublish images"));
await Promise.all(
  images.map((item) =>
    limit(() => {
      // use axios to call rest api in delete method to unpublish image
      console.log("✅ Unpublish:  " + item.filepath);
      const url = `${ADMIN_API_ENDPOINT}/image/${item.image_id}`;
      const config = {
        headers: {
          Authorization: `${credentials.token.IdToken}`,
        },
      };
      return axios.delete(url, config).catch((error) => {
        console.log(error);
      });
    })
  )
);
console.timeEnd("unpublish time");

delete etuYaml.isPublished;
fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));
