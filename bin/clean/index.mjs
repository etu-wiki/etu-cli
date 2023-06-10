import { program } from "commander";
import inquirer from "inquirer";
import path from "path";
import fs from "fs";
import {
  cwd,
  __dirname,
  registerShutdown,
  info,
  error,
  bold,
  warning,
  underline,
} from "../utils/common.mjs";
import yaml from "js-yaml";

const description = `Remove derivative images from importing.

    Example:
        $ etu clean`;

program
  .name("etu clean")
  .option("-y", "skip confirmation")
  .helpOption("-h, --help", "Display help for command")
  .description(description)
  .addHelpCommand(false)
  .parse(process.argv);
const options = program.opts();
// prompt the user to confirm use inquirer
const etuYamlPath = path.join(cwd, "etu.yaml");
if (!fs.existsSync(etuYamlPath)) {
  console.log(error("Please run 'etu init' first."));
  process.exit(1);
}

// remind the user to clean published images first
const etuYaml = yaml.load(fs.readFileSync(path.join(cwd, "etu-lock.yaml")).toString());

if (etuYaml.isPublished) {
  const isPublishedCleaned = await inquirer.prompt([
    {
      type: "confirm",
      name: "continue",
      default: false,
      message: "You have published this project. Leave them on the cloud?",
    },
  ]);
  if (!isPublishedCleaned.continue) {
    console.log(info("Please run 'etu delete' first."));
    process.exit(0);
  }
}


// prompt the user to confirm whether to clean all the derived images from importing
let isContinue;
if (options.y) {
  isContinue = { continue: true };
} else {
  isContinue = await inquirer.prompt([
    {
      type: "confirm",
      name: "continue",
      default: false,
      message: "Are you sure to delete all the derived images from importing?",
    },
  ]);
}
if (isContinue.continue) {
  const sharedPublicPath = path.join(__dirname, "public");
  const privatePublicPath = path.join(cwd, "public");
  if (fs.existsSync(sharedPublicPath)) {
    fs.unlinkSync(sharedPublicPath, { recursive: true });
  }
  if (fs.existsSync(privatePublicPath)) {
    fs.rmSync(privatePublicPath, { recursive: true });
  }
  if (fs.existsSync("etu-lock.yaml")) {
    fs.rmSync("etu-lock.yaml");
  }
}
