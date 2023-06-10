import config from "config";
import fs from "fs";
import os from "os";
import path from "path";
import yaml from "js-yaml";

import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import { AWS_REGION } from "../config.mjs";

const client = new CognitoIdentityProvider({ region: AWS_REGION }); // Replace with your AWS region

const credPath = path.join(os.homedir(), ".etu", ".credentials");
const credentials = yaml.load(fs.readFileSync(credPath).toString());

if (credentials.token) {
  try {
    await client.revokeToken({
      ClientId: config.get("cognitoClientId"),
      Token: credentials.token.RefreshToken,
    });
  } catch (error) {
    console.log("Error revoking token");
    console.error(error);
  }
}

fs.rmSync(path.join(os.homedir(), ".etu", ".credentials"));
console.log("Logout successfully");
