import { program } from "commander";
import path from "path";
import fs from "fs";
import os from "os";
import bytes from "bytes";
import getFolderSize from "get-folder-size";
import {
  cwd,
  __dirname,
  info,
  error,
  bold,
  warning,
  underline,
  getImageAPIVersion,
  isSTSCredentialsExpired,
} from "../utils/common.mjs";
import pLimit from "p-limit";
import mime from "mime-types";

import { Upload } from "@aws-sdk/lib-storage";
import { S3 } from "@aws-sdk/client-s3";
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
} from "../config.mjs";
import yaml from "js-yaml";

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const credPath = path.join(os.homedir(), ".etu", ".credentials");
if (!fs.existsSync(credPath)) {
  console.log("Please login first");
  process.exit(1);
}
const credentials = yaml.load(fs.readFileSync(credPath).toString());

if (isSTSCredentialsExpired(credentials.sts)) {
  console.log("Refreshing credentials");
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

    const newAccessToken =
      initiateAuthResponse.AuthenticationResult.AccessToken;
    const newIdToken = initiateAuthResponse.AuthenticationResult.IdToken;

    credentials.token.AccessToken = newAccessToken;
    credentials.token.IdToken = newIdToken;
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

  credentials.sts = Credentials;
  fs.writeFileSync(credPath, yaml.dump(credentials));
}

const stsCredentials = {
  region: AWS_REGION,
  credentials: {
    accessKeyId: credentials.sts.AccessKeyId,
    secretAccessKey: credentials.sts.SecretKey,
    sessionToken: credentials.sts.SessionToken,
  },
};

const client = new S3(stsCredentials);

const dbclient = new DynamoDB(stsCredentials);

const ddbDocClient = DynamoDBDocument.from(dbclient);

const description = `Publish your Images to ETU IIIF server

Use \`etu status\` afterwards to check publishing status

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
    // if imagePath.path is directory
    let fileFullPath;
    if (fs.lstatSync(imagePath.path).isDirectory()) {
      fileFullPath = path.resolve(imagePath.path, file.filename);
    } else {
      fileFullPath = imagePath.path;
    }
    item.filepath = fileFullPath;
    item.label = imagePath.label + " " + file.label;
    item.iiifversion = etuYaml.iiifVersion;
    item.imageapiversion = getImageAPIVersion(etuYaml.iiifVersion);
    images.push(item);
  }
}

console.time("upload time");
// images = images.filter(
//   (file) => file.filename === "雪梅图.tif" || file.filename === "渔村小雪.tif"
// );
// images = images.filter(file => file.filename === "largeExif.jpg")
// images = images.filter(file => file.filename === "0001_封面.tif")
// images = images.slice(0, 2);
// smallImages.splice(0, 55);
// console.log(smallImages);

// limit file handlers
const limit = pLimit(MAX_CONCURRENT);

// userId is used to isolate different users' data
const tenantId = credentials.user.id;

// check tenant storage quota
// get tenant data from dynamodb
const res = await ddbDocClient.get({
  TableName: TENANT_TABLE,
  Key: {
    tenant_id: tenantId,
  },
});
const tenant = res.Item;

// const tenantData = await ddbDocClient.query({
//   TableName: TENANT_TABLE,
//   KeyConditionExpression: "tenant_id = :tenant_id",
//   ExpressionAttributeValues: {
//     ":tenant_id": tenantId,
//   },
// });
// const tenant = tenantData.Items[0];
// console.log(tenant);
const usage = Math.round(
  (tenant.compress_size_sum / tenant.storage_quota) * 100
);

const message = `You have used ${bytes(
  tenant.compress_size_sum
)} (${usage}%) of total ${bytes(tenant.storage_quota)} storage quota.`;
if (usage < 90) {
  console.log(info(message));
} else if (usage < 100) {
  console.log(warning(message));
} else {
  console.log(
    error(
      `Your storage quota (${bytes(tenant.storage_quota)}) has been exceeded.`
    )
  );
  process.exit(1);
}

const imageFolderSize = await getFolderSize(
  path.join(process.cwd(), "public", "i")
);

if (tenant.compress_size_sum + imageFolderSize.size > tenant.storage_quota) {
  console.log(
    info("Your current project size is " + bytes(imageFolderSize.size))
  );
  console.log(error("Your storage quota will be exceeded if published."));
  process.exit(1);
}

console.log(info("Start uploading images"));
await Promise.all(
  images.map((item) =>
    limit(() => {
      // upload data to S3
      const params = {
        Bucket: UPLOAD_BUCKET,
        Key: tenantId + "/" + item.image_id + path.extname(item.filename),
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
          console.log("✅[100%]  " + item.filepath);
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
