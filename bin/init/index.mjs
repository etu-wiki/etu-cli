import { program } from "commander";
import { pkg, info, error } from "../utils/common.mjs";
import inquirer from "inquirer";
import yaml from "js-yaml";
import { existsSync, writeFileSync } from "fs";
import path from "path";
import fs from "fs";

const description = `Initialize a new project

    Example:
        $ etu init`;

const INIT_PROMPT = `This init process will walk you through creating a etu.yaml file.
It is a property file that is critical to construct ETU project.

Use \`etu import\` afterwards to import iiif public under the initialized folder

Press ^C at any time to quit.
`;

program
  .name("etu init")
  .helpOption("-h, --help", "Display help for command")
  .description(description)
  .addHelpCommand(false)
  .parse(process.argv);

// stop initialization if current folder is not empty
if (fs.readdirSync(process.cwd()).length > 0) {
  console.log(
    error(
      "Current folder is not empty. Please run etu init in an empty folder."
    )
  );
  process.exit(1);
}
console.log(INIT_PROMPT);

const q1q2 = await inquirer.prompt([
  {
    type: "input",
    name: "name",
    message: "project name:",
    default: path.basename(process.cwd()),
    validate(input) {
      return input.length > 0 ? true : "You must provide a project name";
    },
  },
  {
    type: "input",
    name: "author",
    message: "author:"
  },
  {
    type: "input",
    name: "license",
    message: "license:",
  },
  {
    type: "list",
    name: "iiifVersion",
    message: "iiif version:",
    default: "3",
    choices: [
      { name: "v3", value: "3" },
      { name: "v2", value: "2" }
    ],
  },
]);

const answer = { ...q1q2 };

const images = [];
let isContinue;
do {
  const q3 = await inquirer.prompt([
    {
      type: "input",
      name: "path",
      message: "image path:",
      validate(input) {
        return existsSync(input) ? true : "You must provide a valid path";
      },
    },
  ]);
  images.push({ path: path.normalize(path.resolve(q3.path)) });
  isContinue = await inquirer.prompt([
    {
      type: "confirm",
      name: "continue",
      default: false,
      message: "another image path:",
    },
  ]);
} while (isContinue.continue);

answer.images = images;

// const q4 = await inquirer.prompt([
//   {
//     type: "list",
//     name: "format",
//     message: "What is your iiif image format?(4/4)",
//     choices: [
//       { name: "jpeg", value: "jpg" },
//       { name: "webp", value: "webp" },
//       { name: "gif", value: "gif" },
//       { name: "png", value: "png" },
//     ],
//   },
// ]);

// answer.format = q4.format;
// hardcode for this version
answer.format = 'jpg'

writeFileSync(
  path.join(process.cwd(), "etu.yaml"),
  yaml.dump({ version: pkg.version, ...answer })
);
