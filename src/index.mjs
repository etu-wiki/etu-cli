import { program } from 'commander';
import { emoji, getVersion, __dirname } from './utils/common.mjs';
import path from "path";

const system_command = program
    .helpOption('-h, --help', `Display help for command.`)
    .command('init', `${emoji('👍')} Initialize a ETU project.`, { executableFile: path.join(__dirname, 'src/init/index.mjs') })
    .command('add', `${emoji('🖼')}  Add images from local path.`, { executableFile: path.join(__dirname, 'src/add/index.mjs') })
    .command('run', `${emoji('🚀')} Run your local IIIF server.`, { executableFile: path.join(__dirname, 'src/run/index.mjs') })
    .command('login', `${emoji('👤')} Login your ETU account.`, { executableFile: path.join(__dirname, 'src/account/login.mjs') })
    .command('logout', `${emoji('⏏')}  Logout your ETU account.`, { executableFile: path.join(__dirname, 'src/account/logout.mjs') })
    .command('publish', `${emoji('🌎')} Publish your Images to ETU IIIF server.`, { executableFile: path.join(__dirname, 'src/remote/publish.mjs') })
    .command('delete', `${emoji('⛔')} Delete your Images to recover ETU IIIF server storage.`, { executableFile: path.join(__dirname, 'src/remote/delete.mjs') })
    .command('status', `${emoji('♻')}  Check compression status.`, { executableFile: path.join(__dirname, 'src/remote/status.mjs') })
    .version(getVersion(), '-v, --version', 'Output the version number.')
    .addHelpCommand(false);

system_command.parse(process.argv);
