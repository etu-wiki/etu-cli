import { program } from 'commander';
import { emoji, getVersion, pkg, __dirname } from './utils/common.js';
import path from "path";

const system_command = program
    .helpOption('-h, --help', `Display help for command.`)
    .command('init', `${emoji('💞')} Initialize a ETU project.`, { executableFile: path.join(__dirname, 'lib/init/index.js') })
    .command('install', `${emoji('🐚')} Convert images to web compatible format.`, { executableFile: path.join(__dirname, 'lib/install/index.js') })
    .command('run', `${emoji('💥')} Run your local IIIF server.`, { executableFile: path.join(__dirname, 'lib/run/index.js') })
    .version(getVersion(), '-v, --version', 'Output the version number.')
    .addHelpCommand(false);

system_command.parse(process.argv);
