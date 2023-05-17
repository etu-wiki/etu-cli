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

Use \`etu install\` afterwards to install iiif assets under the initialized folder

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

const answer = {};
const q1q2 = await inquirer.prompt([
  {
    type: "input",
    name: "name",
    message: "What is the name of your ETU project?(1/4)",
    default: path.basename(process.cwd()),
    validate(input) {
      return input.length > 0 ? true : "You must provide a project name";
    },
  },
  {
    type: "list",
    name: "viewer",
    message: "Which viewer would you like to use?(2/4)",
    choices: [
      { name: "Mirador 3 (iiif 3)", value: "m3" },
      { name: "Universal Viewer 4 (iiif 2)", value: "u4" },
      { name: "Mirador 2 (iiif 2)", value: "m2" },
      { name: "Universal Viewer 3 (iiif 2)", value: "u3" }
    ],
  },
]);

answer.name = q1q2.name;
answer.viewer = q1q2.viewer;

const images = [];
let isContinue;
do {
  const q3 = await inquirer.prompt([
    {
      type: "input",
      name: "path",
      message: "What is the path of your source image(s)?(3/4)\n",
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
      message: "Do you want to add another image path?",
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
