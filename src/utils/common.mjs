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
export const warning = (message) => `${chalk.yellow("WARNING:")} ${message}`;
export const info = (message) => `${chalk.green("INFO:")} ${message}`;
export const error = (message) => `${chalk.red("ERROR:")} ${message}`;
export const bold = (message) => `${chalk.bold(message)}`;
export const underline = (message) => `${chalk.underline(message)}`;

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

export function getIIIFVersion(viewer) {
  const versionMapping = {
    m2: "2",
    m3: "3",
    u3: "2",
    u4: "2",
  };

  return versionMapping[viewer];
}

export function getImageAPIVersion(viewer) {
  const versionMapping = {
    m2: "2.1",
    m3: "3.0",
    u3: "2.1",
    u4: "2.1",
  };

  return versionMapping[viewer];
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

export function patchViewer(indexPath, presentUuidList, labelList, viewer) {
  const iiifVersion = getIIIFVersion(viewer);
  let indexStr = fs.readFileSync(indexPath).toString();
  let manifestListStr = "";
  let aList;
  switch (viewer) {
    case "m2":
      manifestListStr = JSON.stringify(
        presentUuidList.map((e) => ({
          manifestUri: `p/${iiifVersion}/${e}/manifest.json`,
          location: "ETU",
        }))
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
          manifestId: `p/${iiifVersion}/${e}/manifest.json`,
          provider: "ETU",
        }))
      );
      indexStr = indexStr.replace(
        "'$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$'",
        JSON.stringify(
          presentUuidList.map((e) => ({
            manifestId: `p/${iiifVersion}/${e}/manifest.json`,
          }))
        )
      );

      indexStr = indexStr.replace(
        "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
        manifestListStr
      );
      fs.writeFileSync(indexPath, indexStr);
      break;
    case "u3":
      if (presentUuidList.length === 1) {
        fs.writeFileSync(
          indexPath,
          indexStr.replace(
            "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
            `"p/${iiifVersion}/${presentUuidList[0]}/manifest.json"`
          )
        );
      } else {
        presentUuidList.forEach((e, i) => {
          manifestListStr = `"p/${iiifVersion}/${e}/manifest.json"`;

          fs.writeFileSync(
            path.join(cwd, "asset", `${e}.html`),
            indexStr.replace(
              "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
              manifestListStr
            )
          );
        });
        fs.cpSync(
          path.join(__dirname, "viewer", "index_template.html"),
          path.join(cwd, "asset", "index.html")
        );
        aList = presentUuidList
          .map(
            (e, i) =>
              `<a href="${e}.html" style="color: white;" target="_blank">${labelList[i]}</a>`
          )
          .join("<br>");

        indexStr = fs.readFileSync(indexPath).toString();
        fs.writeFileSync(
          indexPath,
          indexStr.replace("'$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$'", aList)
        );
      }
      break;
    case "u4":
      if (presentUuidList.length === 1) {
        fs.writeFileSync(
          indexPath,
          indexStr.replace(
            "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
            `"p/${iiifVersion}/${presentUuidList[0]}/manifest.json"`
          )
        );
      } else {
        presentUuidList.forEach((e, i) => {
          manifestListStr = `"p/${iiifVersion}/${e}/manifest.json"`;

          fs.writeFileSync(
            path.join(cwd, "asset", `${e}.html`),
            indexStr.replace(
              "'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
              manifestListStr
            )
          );
        });
        fs.cpSync(
          path.join(__dirname, "viewer", "index_template.html"),
          path.join(cwd, "asset", "index.html")
        );
        aList = presentUuidList
          .map(
            (e, i) =>
              `<a href="${e}.html" style="color: white;" target="_blank">${labelList[i]}</a>`
          )
          .join("<br>");

        indexStr = fs.readFileSync(indexPath).toString();
        fs.writeFileSync(
          indexPath,
          indexStr.replace("'$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$'", aList)
        );
      }
      break;
    default:
      break;
  }
}

export function generateManifest(rootPath, etuYaml, isRemote) {
  const iiifVersion = getIIIFVersion(etuYaml.viewer);
  const labelList = etuYaml.images.map((item) => item.label);
  const presentUuidList = [];
  const { presentBaseUrl, imageBaseUrl, format } = etuYaml;

  for (const image of etuYaml.images) {
    const model = {
      presentBaseUrl,
      imageBaseUrl,
      format,
      label: image.label,
      presentUuid: uuid(),
    };
    if (isRemote) {
      model.remote = true;
    }
    image.presentUuid = model.presentUuid;
    presentUuidList.push(model.presentUuid);

    const items = [];
    for (const file of image.files) {
      // deep copy file object
      const item = JSON.parse(JSON.stringify(file));
      // item.level0 = true; // generate level0 image
      item.canvasUuid = uuid();

      if (isRemote) {
        // remote server is level2 and is all tiled
        item.tile = true;
        delete item.level0;
      } else {
        // Add info.json for tiled image
        if (item.tile === true) {
          // console.log('for tile')
          const processor = new SharpIiifShims(
            getImageAPIVersion(etuYaml.viewer),
            0,
            "." + format
          );
          const imageInfo = processor.generateImageInfo(
            imageBaseUrl + "/" + item.image_id,
            { width: item.width, height: item.height }
          );
          delete imageInfo.info.extraFormats;
          delete imageInfo.info.preferredFormats;
          // console.log(imageInfo);
          fs.writeFileSync(
            path.join(rootPath, "i", iiifVersion, item.image_id, "info.json"),
            JSON.stringify(imageInfo.info)
          );
        } else if (iiifVersion === "2") {
          // console.log('for iiif2')
          // Update info.json for IIIF 2
          const processor = new IIIFImageShims(
            getImageAPIVersion(etuYaml.viewer),
            "0",
            "." + format
          );

          const imageInfo = processor.generateImageInfoTemp(
            imageBaseUrl + "/" + item.image_id,
            { width: item.width, height: item.height }
          );
          // console.log(imageInfo);
          fs.writeFileSync(
            path.join(rootPath, "i", iiifVersion, item.image_id, "info.json"),
            JSON.stringify(imageInfo.info)
          );
        }
      }

      items.push(item);
    }

    function addLastMark(arr) {
      return arr.map((e, i, a) => {
        if (a.length === i + 1) {
          e.last = true;
        }
        return e;
      });
    }
    model.items = addLastMark(items);

    const template = fs
      .readFileSync(
        path.join(__dirname, "template", `present${iiifVersion}.mustache`)
      )
      .toString();
    const presentStr = Mustache.render(template, model);

    const presentPath = path.join(
      rootPath,
      "p",
      iiifVersion,
      model.presentUuid
    );
    fs.mkdirSync(presentPath, { recursive: true });
    const presentFile = path.join(presentPath, "manifest.json");
    fs.writeFileSync(presentFile, presentStr);
  }

  fs.cpSync(
    path.join(__dirname, "viewer", etuYaml.viewer),
    path.join(cwd, "asset"),
    { recursive: true }
  );

  console.log(info(`Patching viewer settings`));
  const indexPath = path.join(rootPath, "index.html");

  patchViewer(indexPath, presentUuidList, labelList, etuYaml.viewer);
}
