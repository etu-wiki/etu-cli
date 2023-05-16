import { program } from "commander";
import {
  cwd,
  __dirname,
  getIIIFVersion,
  getMimeType,
  info,
  error,
} from "../utils/common.mjs";
import { readFileSync } from "fs";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import ora from "ora";
import md5File from "md5-file";

// generate thumbnail
const THUMB_DIM_LIMIT = 400;
const SIZE_THRESHOLD = 10000;

const start = Date.now();

const description = `Install a new ETU project

    Example:
        $ etu install`;

program
  .name("etu install")
  .helpOption("-h, --help", "Display help for command")
  .description(description)
  .addHelpCommand(false)
  .parse(process.argv);

let loadYaml = path.join(cwd, "etu.yaml");
if (fs.existsSync(path.join(cwd, "etu-lock.yaml"))) {
  loadYaml = path.join(cwd, "etu-lock.yaml");
}

const etuYaml = yaml.load(readFileSync(loadYaml).toString());
const iiifVersion = getIIIFVersion(etuYaml.viewer);
const imageFolder = path.join(cwd, "asset", "i", iiifVersion);
const subImagePaths = [];

function isAcceptableImage(file) {
  return getMimeType(path.extname(file).slice(1));
}

async function expandPath(image, rootPath) {
  const entry = image.path;
  let files;
  const fileDetails = [];
  if (fs.lstatSync(entry).isDirectory()) {
    files = fs.readdirSync(entry);
  } else {
    files = [entry];
  }
  for (const file of files) {
    const sourceFile = path.resolve(entry, file);

    if (fs.lstatSync(sourceFile).isDirectory()) {
      const subImagePath = { path: sourceFile };
      await expandPath(subImagePath, rootPath);
      subImagePaths.push(subImagePath);
    } else if (isAcceptableImage(sourceFile)) {
      let meta, image;
      try {
        image = sharp(sourceFile, { limitInputPixels: false });
        meta = await image.metadata().catch((err) => {
          // unsupported image format
          console.log(error(sourceFile + " " + err.message));
        });
      } catch (err) {
        console.log(error(err.message));
      }

      // valid image file
      const fileInfo = {};
      if (meta && meta.height && meta.width) {
        console.log(info(`Processing ${sourceFile}`));
        if (meta.height > SIZE_THRESHOLD || meta.width > SIZE_THRESHOLD) {
          console.log(info(`Resizing ${sourceFile}`));
          image = image.resize({
            height: SIZE_THRESHOLD,
            width: SIZE_THRESHOLD,
            fit: "inside",
          });
          const res = await image.toBuffer({ resolveWithObject: true });
          meta.height = res.info.height;
          meta.width = res.info.width;
        }

        fileInfo.filename = path.basename(file);
        fileInfo.label = path.basename(file, path.extname(file));
        fileInfo.height = meta.height;
        fileInfo.width = meta.width;
        fileInfo.etag = md5File.sync(sourceFile);

        fs.mkdirSync(path.join(imageFolder, fileInfo.etag), {
          recursive: true,
        });

        const targetFile = path.join(
          imageFolder,
          fileInfo.etag + "." + etuYaml.format
        );
        if (getMimeType(meta.format) !== getMimeType(etuYaml.format)) {
          const spinner = ora(`Converting ${sourceFile}`).start();
          await image.toFile(targetFile);
          spinner.stop();
        } else {
          fs.copyFileSync(sourceFile, targetFile);
        }

        fileInfo.thumbHeight = Math.round(
          Math.min(
            THUMB_DIM_LIMIT,
            (fileInfo.height / fileInfo.width) * THUMB_DIM_LIMIT
          )
        );
        fileInfo.thumbWidth = Math.round(
          Math.min(
            THUMB_DIM_LIMIT,
            (fileInfo.width / fileInfo.height) * THUMB_DIM_LIMIT
          )
        );

        const thumbnail = image.resize({
          width: THUMB_DIM_LIMIT,
          height: THUMB_DIM_LIMIT,
          fit: "inside",
        });
        const thumbnailPath = path.join(
          imageFolder,
          fileInfo.etag,
          "thumbnail." + etuYaml.format
        );
        thumbnail.toFile(thumbnailPath);

        fileDetails.push(fileInfo);
      }
    }
  }

  if (fileDetails.length > 1) {
    // if there are multiple files, use the folder name
    image.label = entry
      .replace(rootPath, "")
      .replace(/\\/g, " ")
      .replace(/\//g, " ")
      .trim();
  } else if (fileDetails.length === 1) {
    // if there is only one file, use the file name
    image.label = fileDetails[0].label;
  }

  image.files = fileDetails;
}

// install images
for (const image of etuYaml.images) {
  if (!image.files) {
    await expandPath(image, path.join(image.path, ".."));
  }
}

etuYaml.images.push(...subImagePaths);
etuYaml.images = etuYaml.images.filter((image) => image.files.length > 0);

fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));

const stop = Date.now();
console.log(info(`Time Cost: ${(stop - start) / 1000} seconds`));
