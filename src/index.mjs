import { program } from 'commander';
import { emoji, getVersion, __dirname } from './utils/common.mjs';
import path from "path";

const system_command = program
    .helpOption('-h, --help', `Display help for command.`)
    .command('init', `${emoji('💞')} Initialize a ETU project.`, { executableFile: path.join(__dirname, 'src/init/index.mjs') })
    .command('install', `${emoji('🐚')} Convert images to web compatible format.`, { executableFile: path.join(__dirname, 'src/install/index.mjs') })
    .command('run', `${emoji('💥')} Run your local IIIF server.`, { executableFile: path.join(__dirname, 'src/run/index.mjs') })
    .version(getVersion(), '-v, --version', 'Output the version number.')
    .addHelpCommand(false);

system_command.parse(process.argv);
