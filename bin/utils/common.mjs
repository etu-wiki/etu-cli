import os from "os";
import fs from "fs";

import path from "path";
import { fileURLToPath } from "url";

import Mustache from "mustache";
import IIIFImageShims from "@etu-wiki/iiif-image-shims";
import SharpIiifShims from "@etu-wiki/sharp-iiif-shims";

import { v4 as uuid } from "uuid";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.join(path.dirname(__filename), "..", "..");
export const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json")).toString()
);

export const cwd = process.cwd();

import chalk from "chalk";
import jwt from "jsonwebtoken";

import { execSync } from "child_process";

export const warning = (message) => `${chalk.yellow("WARNING:")} ${message}`;
export const info = (message) => `${chalk.green("INFO:")} ${message}`;
export const error = (message) => `${chalk.red("ERROR:")} ${message}`;
export const bold = (message) => `${chalk.bold(message)}`;
export const underline = (message) => `${chalk.underline(message)}`;

export function staticBuild() {
  console.log(info(`Building for the first time`));
  execSync("npm install", { cwd: path.join(__dirname, "app") });
  execSync("npm run build", { cwd: path.join(__dirname, "app") });
  fs.cpSync(path.join(__dirname, "app", "dist"), path.join(cwd, "public"), {
    recursive: true,
  });
}

export function isSTSCredentialsExpired(credentials) {
  const expirationTime = credentials.Expiration;
  const currentTime = new Date();

  return expirationTime < currentTime;
}

export function isIdTokenExpired(idToken) {
  try {
    const decodedToken = jwt.decode(idToken, { complete: true });
    const expirationTime = decodedToken.payload.exp;
    const currentTime = Math.floor(Date.now() / 1000);

    return expirationTime < currentTime;
  } catch (error) {
    // Handle token decoding or verification errors
    console.error("Error decoding or verifying ID token:", error);
    return false;
  }
}

export function getVersion() {
  const data = [
    `${pkg.name}: ${pkg.version}`,
    `${process.platform}-${process.arch}`,
    `node-${process.version}`,
  ];
  return data.filter((o) => o).join(", ");
}

export function emoji(text, fallback) {
  if (os.platform() === "win32") {
    return fallback || "◆";
  }
  return `${text} `;
}

export function getImageAPIVersion(iiifVersion) {
  const versionMapping = {
    3: "3.0",
    2: "2.1",
  };

  return versionMapping[iiifVersion];
}

export function getViewers(iiifVersion) {
  const versionMapping = {
    3: ["m3", "u4"],
    2: ["m2", "u3"],
  };

  return versionMapping[iiifVersion];
}

export function getViewerName(viewer) {
  const nameMapping = {
    m2: "Mirador 2",
    m3: "Mirador 3",
    u3: "Universal Viewer 3",
    u4: "Universal Viewer 4",
  };

  return nameMapping[viewer];
}

export function getMimeType(format) {
  const mimeMapping = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    tif: "image/tiff",
    tiff: "image/tiff",
  };

  return mimeMapping[format];
}

export const registerShutdown = (fn) => {
  let run = false;

  const wrapper = () => {
    if (!run) {
      run = true;
      fn();
    }
  };

  process.on("SIGINT", wrapper);
  process.on("SIGTERM", wrapper);
  process.on("exit", wrapper);
};

function addLastMark(arr) {
  return arr.map((e, i, a) => {
    if (a.length === i + 1) {
      e.last = true;
    }
    return e;
  });
}

export function patchViewer(rootPath, presentUuidList, viewer) {
  const indexPath = path.join(rootPath, `${viewer}.html`);
  let indexStr = fs.readFileSync(indexPath).toString();
  let manifestListStr = "";

  switch (viewer) {
    case "m2":
      manifestListStr = JSON.stringify(
        presentUuidList.map((e) => {
          // generate each m2.html for manifest.json while return the manifestItem to generate manifest list
          const manifestItem = {
            manifestUri: `p/${e}/manifest.json`,
            location: "ETU",
          };
          const indexStrItem = indexStr.replace(
            "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
            JSON.stringify([manifestItem])
          );
          fs.writeFileSync(path.join(rootPath, `m2-${e}.html`), indexStrItem);
          return manifestItem;
        })
      );

      indexStr = indexStr.replace(
        "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
        manifestListStr
      );
      fs.writeFileSync(indexPath, indexStr);
      break;
    case "m3":
      manifestListStr = JSON.stringify(
        presentUuidList.map((e) => ({
          manifestId: `p/${e}/manifest.json`,
          provider: "ETU",
        }))
      );
      indexStr = indexStr.replace(
        "'$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$'",
        JSON.stringify(
          presentUuidList.map((e) => {
            // generate each m3.html for manifest.json while return the manifestItem to generate manifest list
            const manifestItem = {
              manifestId: `p/${e}/manifest.json`,
            };
            let indexStrItem = indexStr.replace(
              "'$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$'",
              JSON.stringify([{ manifestId: "manifest.json" }])
            );
            indexStrItem = indexStrItem.replace(
              "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
              "[]"
            );
            fs.writeFileSync(
              path.join(rootPath, `p/${e}/${viewer}.html`),
              indexStrItem
            );
            return manifestItem;
          })
        )
      );

      indexStr = indexStr.replace(
        "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
        manifestListStr
      );
      fs.writeFileSync(indexPath, indexStr);
      break;
    case "u3":
      presentUuidList.forEach((e, i) => {
        manifestListStr = `"p/${e}/manifest.json"`;

        fs.writeFileSync(
          path.join(cwd, "public", `u3-${e}.html`),
          indexStr.replace("'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'", manifestListStr)
        );
      });
      break;
    case "u4":
      presentUuidList.forEach((e, i) => {
        manifestListStr = `"p/${e}/manifest.json"`;

        fs.writeFileSync(
          path.join(cwd, "public", `u4-${e}.html`),
          indexStr.replace("'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'", manifestListStr)
        );
      });
      break;
    default:
      break;
  }
}

export function generateManifest(etuYaml) {
  const rootPath = path.join(cwd, "public");
  const { presentBaseUrl, imageBaseUrl, format, isRemote, iiifVersion } =
    etuYaml;
  const imageApiVersion = getImageAPIVersion(iiifVersion);
  const presentUuidList = [];

  for (const image of etuYaml.images) {
    const model = {
      presentBaseUrl,
      imageBaseUrl,
      format,
      label: image.label
    };
    if (isRemote) {
      model.remote = true;
    }
    if (image.presentUuid) {
      model.presentUuid = image.presentUuid;
    } else {
      model.presentUuid = uuid();
    }
    image.presentUuid = model.presentUuid;
    presentUuidList.push(model.presentUuid);

    const items = [];
    for (const file of image.files) {
      // deep copy file object
      const item = JSON.parse(JSON.stringify(file));
      item.format = etuYaml.format;
      item.canvasUuid = uuid();

      if (isRemote) {
        // remote server is level2 and is all tiled
        item.tile = true;
        delete item.level0;
      } else {
        // Add info.json for tiled image
        if (item.tile === true) {
          // console.log('for tile')
          const processor = new SharpIiifShims(imageApiVersion, "2");
          const imageInfo = processor.generateImageInfo(
            imageBaseUrl + "/" + item.image_id,
            { width: item.width, height: item.height }
          );
          if (etuYaml.format !== "webp") {
            delete imageInfo.info.extraFormats;
            delete imageInfo.info.preferredFormats;
          }
          fs.writeFileSync(
            path.join(rootPath, "i", item.image_id, "info.json"),
            JSON.stringify(imageInfo.info)
          );
        } else if (iiifVersion === "2") {
          // console.log('for iiif2')
          const processor = new IIIFImageShims(imageApiVersion, "0");
          const imageInfo = processor.generateImageInfoTemp(
            imageBaseUrl + "/" + item.image_id,
            { width: item.width, height: item.height }
          );
          fs.writeFileSync(
            path.join(rootPath, "i", item.image_id, "info.json"),
            JSON.stringify(imageInfo.info)
          );
        }
      }

      items.push(item);
    }

    model.items = addLastMark(items);

    const template = fs
      .readFileSync(
        path.join(__dirname, "template", `present${iiifVersion}.mustache`)
      )
      .toString();
    const presentStr = Mustache.render(template, model);

    const presentPath = path.join(rootPath, "p", model.presentUuid);
    fs.mkdirSync(presentPath, { recursive: true });
    const presentFile = path.join(presentPath, "manifest.json");
    fs.writeFileSync(presentFile, presentStr);
  }

  for (const viewer of getViewers(iiifVersion)) {
    fs.cpSync(
      path.join(__dirname, "viewer", viewer),
      path.join(cwd, "public"),
      { recursive: true }
    );

    console.log(info(`Patching ${getViewerName(viewer)} settings`));

    patchViewer(rootPath, presentUuidList, viewer);
  }

  // fs.cpSync(
  //   path.join(__dirname, "viewer", "index.html"),
  //   path.join(cwd, "public", "index.html")
  // );
}
