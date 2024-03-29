#!/usr/bin/env node
import { program } from 'commander';
import { emoji, getVersion, __dirname } from './utils/common.mjs';
import path from "path";

const system_command = program
    .helpOption('-h, --help', `Display help for command.`)
    .command('init', `${emoji('👍')} Initialize a ETU project.`, { executableFile: path.join(__dirname, 'bin/init/index.mjs') })
    .command('import', `${emoji('🖼')}  Import images from local path.`, { executableFile: path.join(__dirname, 'bin/import/index.mjs') })
    .command('clean', `${emoji('🫧')} Remove derivative images from importing.`, { executableFile: path.join(__dirname, 'bin/clean/index.mjs') })
    .command('run', `${emoji('🚀')} Run your local IIIF server.`, { executableFile: path.join(__dirname, 'bin/run/index.mjs') })
    .command('login', `${emoji('👤')} Login your ETU account.`, { executableFile: path.join(__dirname, 'bin/account/login.mjs') })
    .command('logout', `${emoji('⏏')}  Logout your ETU account.`, { executableFile: path.join(__dirname, 'bin/account/logout.mjs') })
    .command('publish', `${emoji('🌎')} Publish your Images to ETU IIIF server.`, { executableFile: path.join(__dirname, 'bin/remote/publish.mjs') })
    .command('delete', `${emoji('⛔')} Delete your Images to recover ETU IIIF server storage.`, { executableFile: path.join(__dirname, 'bin/remote/delete.mjs') })
    .command('status', `${emoji('♻')}  Check compression status.`, { executableFile: path.join(__dirname, 'bin/remote/status.mjs') })
    .version(getVersion(), '-v, --version', 'Output the version number.')
    .addHelpCommand(false);

system_command.parse(process.argv);
