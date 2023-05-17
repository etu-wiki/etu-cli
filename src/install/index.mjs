import { program } from "commander";
import {
  cwd,
  __dirname,
  getIIIFVersion,
  geImageAPIVersion,
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
import { execSync } from "child_process";
import SharpIiifShims from "@etu-wiki/sharp-iiif-shims";

// generate thumbnail
const WIDTH_SCALE = 4
const THUMB_DIM_LIMIT = 400
const DIM_THRESHOLD = 10000

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
if (!fs.existsSync(loadYaml)) {
  console.log(error("Please run 'etu init' first."));
  process.exit(1);
}

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
  const fileInfoList = [];
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

        // adjust orientation if necessary
        if (meta.orientation >= 5) {
          const t = meta.height;
          meta.height = meta.width;
          meta.width = t;
        }

        fileInfo.filename = path.basename(file);
        fileInfo.label = path.basename(file, path.extname(file));
        fileInfo.height = meta.height;
        fileInfo.width = meta.width;
        fileInfo.etag = md5File.sync(sourceFile);

        fs.mkdirSync(path.join(imageFolder, fileInfo.etag), {
          recursive: true,
        });

        if (meta.height > DIM_THRESHOLD || meta.width > DIM_THRESHOLD) {
          // level 2, dynamic tiles
          fileInfo.tile = true
          const spinner = ora(`Converting standard ${file}`).start();
          const command = `vips dzsave ${sourceFile} ${path.join(imageFolder, fileInfo.etag)} --id http://localhost:3000/${"i/" + iiifVersion} --suffix .${etuYaml.format} --tile-size 512 --layout ${"iiif" + (iiifVersion === "2" ? "" : "3")}`
          execSync(command)

          // await image
          //   .tile({
          //     layout: "iiif" + (iiifVersion === "2" ? "" : "3"),
          //     id: "i/" + iiifVersion,
          //     size: 512,
          //   })
          //   .toFile(path.join(imageFolder, fileInfo.etag));  

          spinner.stop();
        } else {
          fileInfo.level0 = true;
          const targetFile = path.join(
            imageFolder,
            fileInfo.etag + "." + etuYaml.format
          );
          if (getMimeType(meta.format) !== getMimeType(etuYaml.format)) {
            const spinner = ora(`Converting standard express ${sourceFile} l0`).start();
            await image.toFile(targetFile);
            spinner.stop();
          } else {
            fs.copyFileSync(sourceFile, targetFile);
          }
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

        let thumbnail = image.resize({
          width: THUMB_DIM_LIMIT * WIDTH_SCALE,
          height: THUMB_DIM_LIMIT,
          fit: "inside",
        });
        const thumbnailPath = path.join(
          imageFolder,
          fileInfo.etag,
          "thumbnail." + etuYaml.format
        );
        if (meta.orientation && meta.orientation != 1) {
          thumbnail = thumbnail.rotate();
        }
        thumbnail.toFile(thumbnailPath);

        fileInfoList.push(fileInfo);
      }
    }
  }

  if (fileInfoList.length > 1) {
    // if there are multiple files, use the folder name
    image.label = entry
      .replace(rootPath, "")
      .replace(/\\/g, " ")
      .replace(/\//g, " ")
      .trim();
  } else if (fileInfoList.length === 1) {
    // if there is only one file, use the file name
    image.label = fileInfoList[0].label;
  }

  image.files = fileInfoList;
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
