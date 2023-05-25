import { program } from "commander";
import path from "path";
import fs from "fs";
import os from "os";
import {
  cwd,
  __dirname,
  info,
  error,
  bold,
  warning,
  underline,
  getIIIFVersion,
  getImageAPIVersion
} from "../utils/common.mjs";
import pLimit from "p-limit";
import mime from "mime-types";

import { Upload } from "@aws-sdk/lib-storage";
import { S3 } from "@aws-sdk/client-s3";
import { CognitoIdentity } from "@aws-sdk/client-cognito-identity";

import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";

import {
  COGNITO_CLIENT_ID,
  AWS_REGION,
  IDENTITY_POOL_ID,
  USER_POOL_ID,
  UPLOAD_BUCKET,
} from "../config.mjs";
import yaml from "js-yaml";

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

// Get the identity ID using the access token
const userPoolEndpoint = `cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`;
const logins = {};
logins[userPoolEndpoint] = credentials.token.IdToken;

const { IdentityId } = await cognitoClient.getId({
  IdentityPoolId: IDENTITY_POOL_ID,
  Logins: logins,
});

// // Get the temporary credentials using the identity ID
const { Credentials } = await cognitoClient.getCredentialsForIdentity({
  IdentityId,
  Logins: logins,
});

const client = new S3({
  region: AWS_REGION,
  credentials: {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretKey,
    sessionToken: Credentials.SessionToken,
  },
});

const MAX_CONCURRENT = 800;

const description = `Publish local ETU project to Internet

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

console.time("upload time");
// images = images.filter(file => file.filename === "雪梅图.tif" || file.filename === "渔村小雪.tif")
// images = images.filter(file => file.filename === "largeExif.jpg")
// images = images.slice(0, 1);
// smallImages.splice(0, 55);
// console.log(smallImages);

// limit file handlers
const limit = pLimit(MAX_CONCURRENT);
console.log("Uploading images");

// userId is used to isolate different users' data
const userId = credentials.user.id;

await Promise.all(
  images.map((item) =>
    limit(() => {
      // upload data to S3
      const params = {
        Bucket: UPLOAD_BUCKET,
        Key: userId + "/" + item.image_id + path.extname(item.filename),
        Body: fs.createReadStream(item.filepath),
        ContentType: mime.lookup(path.extname(item.filename)).toString(),
        StorageClass: "INTELLIGENT_TIERING",
        Metadata: {
          label: encodeURIComponent(item.label),
          width: item.width.toString(),
          height: item.height.toString(),
          iiifversion: item.iiifversion,
          imageapiversion: item.imageapiversion,
        },
      };
      // console.log(params)
      const upload = new Upload({
        client,
        params,
      });
      upload.on("httpUploadProgress", function (progress) {
        let progressPercentage = Math.round(
          (progress.loaded / progress.total) * 100
        );
        if (progressPercentage >= 100) {
          console.log("✅[100%]  " + item.filepath + "(" + item.image_id + ")");
        } else {
          console.log(
            "⏩[" +
              progressPercentage.toString().padStart(3, " ") +
              "%]  " +
              item.filepath
          );
        }
      });
      return upload.done();
    })
  )
);

console.timeEnd("upload time");

etuYaml.isPublished = true;
fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));
