import { program } from 'commander';
import { pkg } from '../utils/common.js';
import inquirer from "inquirer";
import yaml from "js-yaml";
import { existsSync, writeFileSync } from 'fs';
import path from "path";

const description = `Initialize a new project

    Example:
        $ etu init`;

const INIT_PROMPT = `This utility will walk you through creating a etu.yaml file.
It only covers the most common items, and tries to guess sensible defaults.

Use \`etu install\` afterwards to install iiif images and save them under iiif folder

Press ^C at any time to quit.`

program
    .name('etu init')
    .helpOption('-h, --help', 'Display help for command')
    .description(description)
    .addHelpCommand(false)
    .parse(process.argv);

console.log(INIT_PROMPT);

const answer = await inquirer.prompt([
    {
        type: 'input',
        name: 'name',
        message: 'What is the name of your ETU project?',
        default: path.basename(process.cwd()),
        validate(input) {
            return input.length > 0 ? true : 'You must provide a project name';
        },
    },
    {
        type: "list",
        name: "viewer",
        message: "Which viewer would like to use?",
        choices: [
            { name: "Mirador 2 (iiif 2)", value: "m2" },
            { name: "Mirador 3 (iiif 3)", value: "m3" },
            { name: "Universal Viewer 3 (iiif 2)", value: "u3" },
            { name: "Universal Viewer 4 (iiif 3)", value: "u4" }
        ]
    },
    // {
    //     type: "list",
    //     name: "server",
    //     message: "Which server would like to use?",
    //     choices: [
    //         { name: "Static Web Server", value: "web" },
    //         { name: "IIP Image Server", value: "iip" },
    //         { name: "Cantaloupe Image Server", value: "cantaloupe" },
    //         { name: "SIPI Image Server", value: "sipi" }
    //     ]
    // },
    {
        type: "list",
        name: "format",
        message: "What is your image format?",
        choices: [
            { name: "jpeg", value: "jpg" },
            { name: "avif", value: "avif" },
            { name: "webp", value: "webp" },
            { name: "gif", value: "gif" },
            { name: "png", value: "png" },
        ]
    },
    // {
    //     type: "confirm",
    //     name: "isHD",
    //     message: "Is your image in high definition?",
    //     default: false
    // }
])

const images = []
let isContinue
do {
    const path = await inquirer.prompt([
        {
            type: 'input',
            name: 'path',
            message: 'What is the path of your image? (e.g. /path/to/image.jpg or /path/to/folder)',
            validate(input) {
                return existsSync(input) ? true : 'You must provide a valid path';
            },
        }
    ])
    images.push({ path: path.path })
    isContinue = await inquirer.prompt([
        {
            type: "confirm",
            name: "continue",
            message: "Do you want to add another image path?"
        }
    ])
} while (isContinue.continue);

answer.images = images

writeFileSync(path.join(process.cwd(), 'etu.yaml'), yaml.dump({ version: pkg.version, ...answer }))