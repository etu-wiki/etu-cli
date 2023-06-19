import { program } from "commander";
import {
  cwd,
  __dirname,
  registerShutdown,
  info,
  error,
  warning,
} from "../utils/common.mjs";
import { run } from "./node_srv.mjs";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";

import inquirer from "inquirer";
import { homedir } from "os";

const description = `Initialize a new project

    Example:
        $ etu run`;

program
  .name("etu run")
  .option(
    "-p, --port <port number>",
    "Specify a port on which to listen",
    "3000"
  )
  // .option("--cors", "Enable CORS, sets `Access-Control-Allow-Origin` to `*`")
  .option(
    "--ssl-cert <file path>",
    "Path to an SSL/TLS certificate's public key"
  )
  .option(
    "--ssl-key <file path>",
    "Path to the SSL/TLS certificate's private key"
  )
  .option("-m, --modify-manifest", "Edit manifest in your favorite editor")
  .option("--cookbook", "Run IIIF cookbook recipe in ETU")
  .helpOption("-h, --help", "Display help for command")
  .description(description)
  .addHelpCommand(false)
  .parse(process.argv);

const options = program.opts();

if (options.modifyManifest) {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "editor",
      message: "What is your local editor?",
      choices: [
        { name: "code", value: "code" },
        { name: "webstorm", value: "webstorm" },
        { name: "sublime", value: "sublime" },
        { name: "atom", value: "atom" },
        { name: "idea14ce", value: "idea14ce" },
        { name: "vim", value: "vim" },
        { name: "emacs", value: "emacs" },
        { name: "visualstudio", value: "visualstudio" },
      ],
    },
  ]);
  options.editor = answer.editor;
}

let ETU_PATH;
let etuYaml;

if (options.cookbook) {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "viewer",
      message: "Which viewer would like to use?",
      choices: [
        { name: "Mirador 3 (iiif 3)", value: "m3" },
        { name: "Universal Viewer 4 (iiif 3)", value: "u4" },
      ],
    },
    {
      type: "list",
      name: "cookbook",
      message: "Which recipe would you like to choose?",
      choices: [
        "0001-mvm-image",
        "0002-mvm-audio",
        "0003-mvm-video",
        "0004-canvas-size",
        "0005-image-service",
        "0006-text-language",
        "0007-string-formats",
        "0008-rights",
        "0009-book-1",
        "0010-book-2-viewing-direction",
        "0011-book-3-behavior",
        "0013-placeholderCanvas",
        "0014-accompanyingcanvas",
        "0015-start",
        "0017-transcription-av",
        "0021-tagging",
        "0024-book-4-toc",
        "0026-toc-opera",
        "0029-metadata-anywhere",
        "0030-multi-volume",
        "0033-choice",
        "0035-foldouts",
        "0036-composition-from-multiple-images",
        "0046-rendering",
        "0053-seeAlso",
        "0064-opera-one-canvas",
        "0065-opera-multiple-canvases",
        "0068-newspaper",
        "0074-multiple-language-captions",
        "0117-add-image-thumbnail",
        // "0139-geolocate-canvas-fragment",  # not implemented yet
        "0219-using-caption-file",
        "0202-start-canvas",
        "0230-navdate",
        "0232-image-thumbnail-canvas-1",
        "0232-image-thumbnail-canvas-2",
        "0234-provider",
        // "0258-tagging-external-resource",  # not implemented yet
        "0261-non-rectangular-commenting",
        "0266-full-canvas-annotation",
        "0269-embedded-or-referenced-annotations",
      ],
    },
  ]);

  ETU_PATH = path.join(homedir(), "etu-cookbook");

  etuYaml = {
    viewer: answer.viewer,
    iiifVersion: '3',
    images: [{ presentUuid: answer.cookbook }],
  };

  run(ETU_PATH, options, etuYaml);

  registerShutdown(() => {
    fs.rmSync(ETU_PATH, { recursive: true, force: true });
    fs.unlinkSync(path.join(__dirname, 'public'));
  });
} else {
  ETU_PATH = path.join(__dirname, "build");
  console.log(info(`ETU -- Simple but not simplistic`));

  const etuLockYaml = path.join(cwd, "etu-lock.yaml");

  // etu-lock.yaml has to be existed before
  if (!fs.existsSync(etuLockYaml)) {
    console.log(
      error(`No etu-lock.yaml found in ${cwd}  Please run 'etu import' first.`)
    );
    process.exit(1);
  }

  etuYaml = yaml.load(fs.readFileSync(etuLockYaml).toString());

  // when run in remote, the project has to be published before
  if (!etuYaml.isPublished && etuYaml.isRemote) {
    console.log(
      error(`The ETU project can not run in remote mode because it has not been published before.`)
    );
    process.exit(1);
  }

  run(ETU_PATH, options, etuYaml);
}
