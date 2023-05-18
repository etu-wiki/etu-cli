import { program } from "commander";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";
import {
  cwd,
  __dirname,
  info,
  error,
  bold,
  warning,
  underline,
  getIIIFVersion,
} from "../utils/common.mjs";
import pLimit from "p-limit";
import mime from "mime-types";

import { Upload } from "@aws-sdk/lib-storage";

import { S3 } from "@aws-sdk/client-s3";
const client = new S3({ region: "cn-northwest-1" });

const MAX_CONCURRENT = 800;

const description = `Publish local ETU project to Internet

    Example:
        $ etu publish`;

program.name("etu publish").description(description);

const etuLockYaml = path.join(cwd, "etu-lock.yaml");
if (!fs.existsSync(etuLockYaml)) {
  console.log(
    error(`No etu-lock.yaml found in ${cwd}  Please run 'etu install' first.`)
  );
  process.exit(1);
}

let images = [];
const etuYaml = yaml.load(fs.readFileSync(etuLockYaml).toString());
for (let imagePath of etuYaml.images) {
  for (let file of imagePath.files) {
    const fileFullPath = path.join(imagePath.path, file.filename);
    file.filepath = fileFullPath;
    file.label = imagePath.label + " " + file.label;
    file.iiifversion = getIIIFVersion(etuYaml.viewer);
    images.push(file);
  }
}

console.time("upload time");
// images = images.filter(file => file.filename === "雪梅图.tif" || file.filename === "渔村小雪.tif")
// images = images.slice(0, 2);
// smallImages.splice(0, 55);
// console.log(smallImages);

// limit file handlers
const limit = pLimit(MAX_CONCURRENT);
console.log("Uploading images");

// for (let item of smallImages) {
//   await client.putObject({
//     Bucket: "gsh-assets",
//     Key: item.image_id + path.basename(item.filename),
//     Body: fs.createReadStream(item.filepath),
//     ContentType: mime.lookup(path.extname(item.filename)).toString(),
//     CacheControl: "public, max-age=31536000",
//     StorageClass: "INTELLIGENT_TIERING",
//   });
// }

await Promise.all(
  images.map((item) =>
    limit(() => {
      // console.log(item.image_id + path.extname(item.filename))
      // upload data to S3
      const params = {
        Bucket: "stagingcn-upload",
        Key: item.image_id + path.extname(item.filename),
        Body: fs.createReadStream(item.filepath),
        ContentType: mime.lookup(path.extname(item.filename)).toString(),
        StorageClass: "INTELLIGENT_TIERING",
        Metadata: {
          label: encodeURIComponent(item.label),
          width: item.width.toString(),
          height: item.height.toString(),
          iiifversion: item.iiifversion,
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

etuYaml.isPublished = true
fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));
