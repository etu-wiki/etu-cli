import os from 'os';
import fs from 'fs';

import path from "path";
import { fileURLToPath } from "url";

import Mustache from "mustache";
import IIIFImageShims from "@etu-wiki/iiif-image-shims";

import { v4 as uuid } from "uuid";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.join(path.dirname(__filename), "..", "..");
export const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json")).toString());

export const cwd = process.cwd()

import chalk from "chalk";
export const warning = (message: any) => `${chalk.yellow("WARNING:")} ${message}`;
export const info = (message: any) => `${chalk.green("INFO:")} ${message}`;
export const error = (message: any) => `${chalk.red("ERROR:")} ${message}`;
export const bold = (message: any) => `${chalk.bold(message)}`;
export const underline = (message: any) => `${chalk.underline(message)}`;

export function getVersion() {
  const data = [
    `${pkg.name}: ${pkg.version}`,
    `${process.platform}-${process.arch}`,
    `node-${process.version}`,
  ];
  return data.filter(o => o).join(', ');
}

export function emoji(text: string, fallback?: string) {
  if (os.platform() === 'win32') {
    return fallback || '◆';
  }
  return `${text} `;
}

export function getIIIFVersion(viewer: string) {
  const versionMapping: any = {
    m2: '2',
    m3: '3',
    u3: '2',
    u4: '3',
  }

  return versionMapping[viewer];
}

export function getViewerName(viewer: string) {
  const nameMapping: any = {
    m2: 'Mirador 2',
    m3: 'Mirador 3',
    u3: 'Universal Viewer 3',
    u4: 'Universal Viewer 4',
  }

  return nameMapping[viewer];
}

export function getMimeType(format: string) {
  const mimeMapping: any = {
    jpg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    avif: 'image/avif',
    webp: 'image/webp',
  }
  
  return mimeMapping[format];
}

export const registerShutdown = (fn: any) => {
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

export function patchViewer(indexPath: any, presentUuidList: any, labelList: any, viewer: any) {
  const iiifVersion = getIIIFVersion(viewer);
  let indexStr = fs.readFileSync(indexPath).toString();
  let manifestListStr = "";
  let aList;
  switch (viewer) {
      case 'm2':
          manifestListStr = JSON.stringify(presentUuidList.map((e: any) => ({ manifestUri: `p/${iiifVersion}/${e}/manifest.json`, location: 'ETU' })))

          indexStr = indexStr.replace("'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'", manifestListStr);
          fs.writeFileSync(indexPath, indexStr);
          break;
      case 'm3':
          manifestListStr = JSON.stringify(presentUuidList.map((e: any) => ({ manifestId: `p/${iiifVersion}/${e}/manifest.json`, provider: 'ETU' })))
          indexStr = indexStr.replace("'$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$'", JSON.stringify(presentUuidList.map((e: any) => ({ "manifestId": `p/${iiifVersion}/${e}/manifest.json` }))));

          indexStr = indexStr.replace("'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'", manifestListStr);
          fs.writeFileSync(indexPath, indexStr);
          break;
      case 'u3':
          if (presentUuidList.length === 1) {
              fs.writeFileSync(indexPath, indexStr.replace("'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'", `"p/${iiifVersion}/${presentUuidList[0]}/manifest.json"`));
          } else {
              presentUuidList.forEach((e: any, i: any) => {
                  manifestListStr = `"p/${iiifVersion}/${e}/manifest.json"`;

                  fs.writeFileSync(path.join(cwd, "asset", `${e}.html`), indexStr.replace("'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'", manifestListStr));
              });
              fs.cpSync(path.join(__dirname, "viewer", "index_template.html"), path.join(cwd, "asset", "index.html"));
              aList = presentUuidList.map((e: any, i: any) => `<a href="${e}.html" style="color: white;" target="_blank">${labelList[i]}</a>`).join("<br>");

              indexStr = fs.readFileSync(indexPath).toString();
              fs.writeFileSync(indexPath, indexStr.replace("'$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$'", aList));
          }
          break;
      case 'u4':
          if (presentUuidList.length === 1) {
              fs.writeFileSync(indexPath, indexStr.replace("'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'", `"p/${iiifVersion}/${presentUuidList[0]}/manifest.json"`));
          } else {
              presentUuidList.forEach((e: any, i: any) => {
                  manifestListStr = `"p/${iiifVersion}/${e}/manifest.json"`;

                  fs.writeFileSync(path.join(cwd, "asset", `${e}.html`), indexStr.replace("'@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'", manifestListStr));
              });
              fs.cpSync(path.join(__dirname, "viewer", "index_template.html"), path.join(cwd, "asset", "index.html"));
              aList = presentUuidList.map((e: any, i: any) => `<a href="${e}.html" style="color: white;" target="_blank">${labelList[i]}</a>`).join("<br>");

              indexStr = fs.readFileSync(indexPath).toString();
              fs.writeFileSync(indexPath, indexStr.replace("'$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$'", aList));
          }
          break;
      default:
          break;
  }
}

export function generateManifest(rootPath: any, etuYaml: any, presentBaseUrl: string, imageBaseUrl: string) {
  const iiifVersion = getIIIFVersion(etuYaml.viewer);
  const labelList = etuYaml.images.map((item: any) => item.label);
  const presentUuidList = [];

  for (const image of etuYaml.images) {
      const model: any = {
          presentBaseUrl,
          imageBaseUrl,
          format: etuYaml.format,
          label: image.label,
          presentUuid: uuid()
      };
      image.presentUuid = model.presentUuid;
      presentUuidList.push(model.presentUuid);

      const items: any = []
      for (const file of image.files) {
          const item: any = file
          item.level0 = true; // generate level0 image
          item.canvasUuid = uuid();

          // Add info.json for IIIF 2
          if (iiifVersion === "2") {
              const processor = new IIIFImageShims("2.1", "0", "." + etuYaml.format);

              const imageInfo = processor.generateImageInfoTemp(
                  imageBaseUrl + "/i/" + iiifVersion + "/" + item.etag,
                  { width: item.width, height: item.height }
              );

              fs.writeFileSync(path.join(rootPath, "i", iiifVersion, item.etag, "info.json"), JSON.stringify(imageInfo.info));
          }
          items.push(item);
      }

      function addLastMark(arr: any) {
          return arr.map((e: any, i: any, a: any) => {
              if (a.length === i + 1) {
                  e.last = true;
              }
              return e;
          });
      }
      model.items = addLastMark(items);

      const template = fs.readFileSync(path.join(__dirname, "template", `present${iiifVersion}.mustache`)).toString();
      const presentStr = Mustache.render(template, model);

      const presentPath = path.join(rootPath, "p", iiifVersion, model.presentUuid);
      fs.mkdirSync(presentPath, { recursive: true });
      const presentFile = path.join(presentPath, "manifest.json");
      fs.writeFileSync(presentFile, presentStr);
  }

  fs.cpSync(path.join(__dirname, "viewer", etuYaml.viewer), path.join(cwd, "asset"), { recursive: true });

  console.log(info(`Patching viewer settings`));
  const indexPath = path.join(rootPath, "index.html");

  patchViewer(indexPath, presentUuidList, labelList, etuYaml.viewer)
}