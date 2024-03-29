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
  isIdTokenExpired,
} from "../utils/common.mjs";
import pLimit from "p-limit";

import { CognitoIdentity } from "@aws-sdk/client-cognito-identity";
import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";

import {
  MAX_CONCURRENT,
  COGNITO_CLIENT_ID,
  AWS_REGION,
  ADMIN_API_ENDPOINT,
  IMAGE_API_ENDPOINT
} from "../config.mjs";
import yaml from "js-yaml";

const credPath = path.join(os.homedir(), ".etu", ".credentials");
if (!fs.existsSync(credPath)) {
  console.log("Please login first");
  process.exit(1);
}
const credentials = yaml.load(fs.readFileSync(credPath).toString());

// Configure the Cognito client
const cognitoProviderClient = new CognitoIdentityProvider({
  region: AWS_REGION,
});

let idToken = credentials.token.IdToken;

if (isIdTokenExpired(idToken)) {
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

    const newAccessToken =
      initiateAuthResponse.AuthenticationResult.AccessToken;
    const newIdToken = initiateAuthResponse.AuthenticationResult.IdToken;

    credentials.token.AccessToken = newAccessToken;
    credentials.token.IdToken = newIdToken;
    fs.writeFileSync(credPath, yaml.dump(credentials));

    idToken = newIdToken;
  } catch (error) {
    if (error.message === "Refresh Token has been revoked") {
      console.log("Please login first");
      process.exit(1);
    }
  }
}
const description = `Check compression status.

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
    images.push(item);
  }
}

console.time("check status time");

// limit file handlers
const limit = pLimit(MAX_CONCURRENT);

console.log(info("Start checking compression status"));
const messages = []
await Promise.all(
  images.map((item) =>
    limit(() => {
      const url = `${ADMIN_API_ENDPOINT}/compress-status/${item.image_id}`;
      const config = {
        headers: {
          Authorization: `${idToken}`,
        },
      };
      return axios
        .get(url, config)
        .then((data) => {
          let emoji;
          if (data.data.status === "SUCCEEDED") {
            emoji = "✅";
            console.log(`${emoji} ${data.data.status}:  ` + item.filepath );
            console.log(info("thumbnail url: " + `${IMAGE_API_ENDPOINT}/${item.image_id}/full/400,/0/default.${etuYaml.format}\n`))
          } else if (data.data.status === "FAILED") {
            emoji = "❌";
            messages.push(`${emoji} ${data.data.status}:  ` + item.filepath);
          } else {
            emoji = "⏳";
            messages.push(`${emoji} ${data.data.status}:  ` + item.filepath);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    })
  )
);
console.log(messages.join("\n"));
console.timeEnd("check status time");

fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));
