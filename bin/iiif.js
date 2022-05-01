import fs from "fs";
import os from "os";
import path from "path";

import ora from "ora";
import mkdir from "make-dir";
import Mustache from "mustache";
import { v4 as uuid } from "uuid";

import chalk from "chalk";
const warning = (message) => `${chalk.yellow(" WARNING:")} ${message}`;
const info = (message) => `${chalk.magenta(" INFO:")} ${message}`;
const error = (message) => `${chalk.red(" ERROR:")} ${message}`;

import Jimp from "jimp";

import {fileURLToPath} from 'url';
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

export default async function generateIIIF(
  entry,
  viewer,
  iiifVersion,
  baseUrl
) {
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

      const imageFolder = ETU_PATH + "i/" + iiifVersion + "/";
      mkdir.sync(imageFolder);

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

      items.push(item);
    }
  }

  model.items = addLastMark(items);
  if (items.length > 1) {
    model.label = path.basename(entry);
  } else if (items.length === 1) {
    model.label = items[0].label;
  }

  const template = fs
    .readFileSync(__dirname + "/../template/present" + iiifVersion + ".mustache")
    .toString();
  const present = Mustache.render(template, model);

  // const presentFolder = ETU_PATH + "p/" + iiifVersion + "/";
  // mkdir.sync(presentFolder);
  // fs.writeFileSync(presentFolder + presentUuid + ".json", present);

  fs.writeFileSync(ETU_PATH + "manifest.json", present);
}
