import fs from "fs";
import os from "os";
import path from "path";

import ora from "ora";
import Mustache from "mustache";
import { v4 as uuid } from "uuid";

import chalk from "chalk";
const warning = (message) => `${chalk.yellow("WARNING:")} ${message}`;
const info = (message) => `${chalk.magenta("INFO:")} ${message}`;
const error = (message) => `${chalk.red("ERROR:")} ${message}`;

import Jimp from "jimp";
import IiifImageShims from "@etu-wiki/iiif-image-shims";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ETU_PATH = os.homedir + "/etu/";

function addLastMark(arr) {
  return arr.map((e, i, a) => {
    if (a.length === i + 1) {
      e.last = true;
    }
    return e;
  });
}

export default async function generateIIIF(entry, iiifVersion, baseUrl) {
  const imageFolder = ETU_PATH + "i/" + iiifVersion + "/";
  const presentUuid = uuid();

  const model = {
    baseUrl,
    presentUuid,
  };

  const items = [];
  let files;
  if (fs.lstatSync(entry).isDirectory()) {
    files = fs.readdirSync(entry);
  } else {
    files = [entry];
  }
  for (const file of files) {
    const sourceFile = path.resolve(entry, file);
    console.log(info(`Convert ${sourceFile}`));
    const item = {};

    // Code for jimp
    let meta, image;
    try {
      image = await Jimp.read(sourceFile);
      meta = {
        width: image.bitmap.width,
        height: image.bitmap.height,
        format: image.getMIME(),
      };
    } catch (err) {
      console.error(err.message);
      throw Error("Your file is too large to process.");
    }

    if (meta && meta.height && meta.width) {
      item.label = path.basename(file, path.extname(file));
      item.height = meta.height;
      item.width = meta.width;
      item.canvasUuid = uuid();
      item.etag = uuid();

      fs.mkdirSync(imageFolder + item.etag, { recursive: true });

      // Code for Jimp
      item.level0 = true;
      const fullImage = imageFolder + item.etag + ".jpg";
      if (meta.format !== Jimp.MIME_JPEG) {
        const spinner = ora(`Converting ${sourceFile}`).start();
        image.quality(75).write(fullImage);
        spinner.stop();
      } else {
        fs.copyFileSync(sourceFile, fullImage);
      }

      // Add info.json and thumbnail for IIIF 2
      if (iiifVersion === "2") {
        console.log(info(`Convert ${sourceFile}`));
        const processor = new IiifImageShims("2.1", "0", ".jpg");

        const imageInfo = processor.generateImageInfoTemp(
          model.baseUrl + "/i/" + iiifVersion + "/" + item.etag,
          { width: item.width, height: item.height }
        );

        fs.writeFileSync(
          imageFolder + item.etag + "/info.json",
          JSON.stringify(imageInfo.info)
        );
      }

      // generate thumbnail
      const THUMB_DIM_LIMIT = 400;

      item.thumbHeight = Math.round(
        Math.min(THUMB_DIM_LIMIT, (item.height / item.width) * THUMB_DIM_LIMIT)
      );
      item.thumbWidth = Math.round(
        Math.min(THUMB_DIM_LIMIT, (item.width / item.height) * THUMB_DIM_LIMIT)
      );

      const thumbnail = await image.resize(item.thumbWidth, item.thumbHeight);
      const thumbnailPath = imageFolder + item.etag + "/thumbnail.jpg";
      thumbnail.write(thumbnailPath);

      items.push(item);
    }
  }

  model.items = addLastMark(items);
  if (items.length > 1) {
    model.label = path.basename(entry);
  } else if (items.length === 1) {
    model.label = items[0].label;
  }

  model.thumbnailPath = imageFolder + items[0].etag + "/thumbnail.jpg";

  const template = fs
    .readFileSync(
      __dirname + "/../template/present" + iiifVersion + ".mustache"
    )
    .toString();
  const present = Mustache.render(template, model);

  fs.writeFileSync(ETU_PATH + "manifest.json", present);
}
