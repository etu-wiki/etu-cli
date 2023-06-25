import { program } from "commander";
import { v4 as uuid } from "uuid";
import {
  cwd,
  __dirname,
  getMimeType,
  info,
  error,
  generateManifest,
  staticBuild,
} from "../utils/common.mjs";
import { readFileSync } from "fs";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import ora from "ora";
// import md5File from "md5-file";
import { execSync } from "child_process";

import {
  THUMB_WIDTH_THRESHOLD,
  THUMB_HEIGHT_THRESHOLD,
  HD_DIM_THRESHOLD,
  IMAGE_API_ENDPOINT,
} from "../config.mjs";

const start = Date.now();

const description = `Import images from local path.

    Example:
        $ etu import`;

program
  .name("etu import")
  .option("-r, --remote", "import image for hosting server")
  .helpOption("-h, --help", "Display help for command")
  .description(description)
  .addHelpCommand(false)
  .parse(process.argv);

const options = program.opts();

let etuYamlPath = path.join(cwd, "etu.yaml");
if (!fs.existsSync(etuYamlPath)) {
  console.log(error("Please run 'etu init' first."));
  process.exit(1);
}
const etuYaml = yaml.load(readFileSync(etuYamlPath).toString());

// init etu-lock from etu.yaml if not exist
let etuLockYamlPath = path.join(cwd, "etu-lock.yaml");
let etuLockYaml;
if (fs.existsSync(etuLockYamlPath)) {
  etuLockYaml = yaml.load(readFileSync(etuLockYamlPath).toString());
} else {
  etuLockYaml = JSON.parse(JSON.stringify(etuYaml));
}

const imageFolder = path.join(cwd, "public", "i");
const sourceFileFolderInfoList = [];
const compressedFileFolderInfoList = [];

function isAcceptableImage(file) {
  return getMimeType(path.extname(file).slice(1));
}

async function expandPath(image, rootPath) {
  const entry = image.path;
  let files;
  const sourceFileInfoList = [];
  const compressedFileInfoList = [];
  if (fs.lstatSync(entry).isDirectory()) {
    files = fs.readdirSync(entry);
  } else {
    files = [entry];
  }
  for (const file of files) {
    const filePath = path.resolve(entry, file);

    if (fs.lstatSync(filePath).isDirectory()) {
      // iterate subfolders and files
      const fileFolder = { path: filePath };

      const compressedFileInfoList = await expandPath(fileFolder, rootPath);
      sourceFileFolderInfoList.push(fileFolder);

      const label = filePath
        .replace(rootPath, "")
        .replace(/\\/g, " ")
        .replace(/\//g, " ")
        .trim();

      const compressedFileFoler = {
        path: filePath,
        label,
        files: compressedFileInfoList,
      };

      compressedFileFolderInfoList.push(compressedFileFoler);
    } else if (isAcceptableImage(filePath)) {
      let meta, image;
      try {
        image = sharp(filePath, { limitInputPixels: false });
        meta = await image.metadata().catch((err) => {
          // unsupported image format
          console.log(error(filePath + " " + err.message));
        });
      } catch (err) {
        console.log(error(err.message));
      }

      // valid image file
      const sourceFileInfo = {};
      const compressedFileInfo = {};
      if (meta && meta.height && meta.width) {
        console.log(info(`Importing ${filePath}`));

        // adjust orientation if necessary
        if (meta.orientation >= 5) {
          const t = meta.height;
          meta.height = meta.width;
          meta.width = t;

          image = image.rotate();
        }

        compressedFileInfo.filename = path.basename(file);

        compressedFileInfo.label = path.basename(file, path.extname(file));
        compressedFileInfo.image_id = uuid();
        compressedFileInfo.source_format = meta.format;
        compressedFileInfo.height = meta.height;
        compressedFileInfo.width = meta.width;
        // compressedFileInfo.md5 = md5File.sync(sourceFile);

        fs.mkdirSync(path.join(imageFolder, compressedFileInfo.image_id), {
          recursive: true,
        });

        // skip image conversion in remote mode
        if (!options.remote) {
          if (meta.height > HD_DIM_THRESHOLD || meta.width > HD_DIM_THRESHOLD) {
            const spinner = ora(`Converting standard ${filePath} `).start();
            compressedFileInfo.level0 = true;
            await image
              .resize({
                width: HD_DIM_THRESHOLD,
                height: HD_DIM_THRESHOLD,
                fit: "inside",
              })
              .toFile(
                path.join(
                  imageFolder,
                  compressedFileInfo.image_id + "." + etuYaml.format
                )
              );
            spinner.stop();
          } else {
            compressedFileInfo.level0 = true;
            const targetFile = path.join(
              imageFolder,
              compressedFileInfo.image_id + "." + etuYaml.format
            );
            if (getMimeType(meta.format) !== getMimeType(etuYaml.format)) {
              const spinner = ora(
                `Converting standard express ${filePath} `
              ).start();

              await image.toFile(targetFile);
              spinner.stop();
            } else {
              // skip convertion if the image is already in the target format
              fs.copyFileSync(filePath, targetFile);
            }
          }

          let thumbnail = image.resize({
            width: THUMB_WIDTH_THRESHOLD,
            height: THUMB_HEIGHT_THRESHOLD,
            fit: "inside",
          });
          const thumbnailPath = path.join(
            imageFolder,
            compressedFileInfo.image_id,
            "thumbnail." + etuYaml.format
          );
          if (meta.orientation && meta.orientation != 1) {
            thumbnail = thumbnail.rotate();
          }

          const res = await thumbnail
            .toFormat(etuYaml.format)
            .toBuffer({ resolveWithObject: true });
          fs.writeFileSync(thumbnailPath, res.data);

          compressedFileInfo.thumbHeight = res.info.height;
          compressedFileInfo.thumbWidth = res.info.width;
        }
        sourceFileInfoList.push(sourceFileInfo);
        compressedFileInfoList.push(compressedFileInfo);
      }
    }
  }

  return compressedFileInfoList;
}

// import images
etuLockYaml.images = [];
for (const image of etuYaml.images) {
  if (!image.files) {
    const compressedFileInfoList = await expandPath(
      image,
      path.join(image.path, "..")
    );
    let label;
    if (compressedFileInfoList.length === 1) {
      label = compressedFileFolderInfoList[0].label;
    } else {
      label = image.path.split(path.sep).pop();
    }
    etuLockYaml.images.push({
      path: image.path,
      label,
      files: compressedFileInfoList,
    });
  }
}

etuLockYaml.images.push(...compressedFileFolderInfoList);
etuLockYaml.images = etuLockYaml.images.filter(
  (image) => image.files.length > 0
);

fs.writeFileSync(`${cwd}/etu.yaml`, yaml.dump(etuYaml));

const baseUrl = "http://localhost:3000";
console.log(info(`Generating Manifests`));
etuLockYaml.presentBaseUrl = baseUrl + "/p/";

if (options.remote) {
  etuLockYaml.isRemote = true;
  etuLockYaml.imageBaseUrl = IMAGE_API_ENDPOINT;
} else {
  etuLockYaml.isRemote = false;
  etuLockYaml.imageBaseUrl = baseUrl + "/i/";
}

generateManifest(etuLockYaml);
fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuLockYaml));

// convert etuLockYaml to json and save to etu.json under public folder
fs.writeFileSync(
  `${__dirname}/app/src/assets/etu.json`,
  JSON.stringify(etuLockYaml, null, 2)
);

staticBuild();

const stop = Date.now();
console.log(info(`Import Time: ${(stop - start) / 1000} seconds`));
