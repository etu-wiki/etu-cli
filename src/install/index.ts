import { program } from 'commander';
import { cwd, __dirname, getIIIFVersion, getMimeType, info, error } from '../utils/common.js';
import { readFileSync } from "fs";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import ora from "ora";
import md5File from "md5-file"

const start = Date.now();

const description = `Install a new ETU project

    Example:
        $ etu install`;

program
    .name('etu install')
    .helpOption('-h, --help', 'Display help for command')
    .description(description)
    .addHelpCommand(false)
    .parse(process.argv);

let loadYaml = path.join(cwd, 'etu.yaml');
if (fs.existsSync(path.join(cwd, "etu-lock.yaml"))) {
    loadYaml = path.join(cwd, 'etu-lock.yaml');
}

const etuYaml: any = yaml.load(readFileSync(loadYaml).toString());
const iiifVersion = getIIIFVersion(etuYaml.viewer);
const imageFolder = path.join(cwd, "asset", "i", iiifVersion);

// install images
for (const image of etuYaml.images) {
    if (!image.files) {
        const entry = image.path;
        let files;
        const fileDetails = []
        if (fs.lstatSync(entry).isDirectory()) {
            files = fs.readdirSync(entry);
        } else {
            files = [entry];
        }
        for (const file of files) {
            const sourceFile = path.resolve(entry, file);

            let meta, image: any;
            try {
                image = sharp(sourceFile, { limitInputPixels: false });
                meta = await image.metadata().catch((err: any) => {
                    // unsupported image format
                    console.log(error(sourceFile + " " + err.message));
                });
            } catch (err: any) {
                console.log(error(err.message));
            }

            // valid image file
            const fileInfo: any = {}
            if (meta && meta.height && meta.width) {
                fileInfo.filename = path.basename(file);
                fileInfo.label = path.basename(file, path.extname(file));
                fileInfo.height = meta.height;
                fileInfo.width = meta.width;
                fileInfo.etag = md5File.sync(sourceFile);

                fs.mkdirSync(path.join(imageFolder, fileInfo.etag), { recursive: true });

                console.log(info(`Convert ${sourceFile}`));
                const targetFile = path.join(imageFolder, fileInfo.etag + "." + etuYaml.format);
                if (meta.format !== getMimeType(etuYaml.format)) {
                    const spinner = ora(`Converting ${sourceFile}`).start();
                    await image.toFile(targetFile);
                    spinner.stop();
                } else {
                    fs.copyFileSync(sourceFile, targetFile);
                }

                // generate thumbnail
                const THUMB_DIM_LIMIT = 400;

                fileInfo.thumbHeight = Math.round(
                    Math.min(THUMB_DIM_LIMIT, (fileInfo.height / fileInfo.width) * THUMB_DIM_LIMIT)
                );
                fileInfo.thumbWidth = Math.round(
                    Math.min(THUMB_DIM_LIMIT, (fileInfo.width / fileInfo.height) * THUMB_DIM_LIMIT)
                );

                const thumbnail = image.resize({ width: THUMB_DIM_LIMIT, height: THUMB_DIM_LIMIT, fit: "inside" })
                const thumbnailPath = path.join(imageFolder, fileInfo.etag, "thumbnail." + etuYaml.format);
                thumbnail.toFile(thumbnailPath);

                fileDetails.push(fileInfo);
            }
        }

        let label;
        // guess meaningful label
        if (files.length > 1) {
            label = path.basename(entry);
        } else if (fileDetails.length === 1) {
            label = fileDetails[0].label;
        }

        image.label = label;
        image.files = fileDetails;
    }
}

fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));

const stop = Date.now();
console.log(info(`Time Cost: ${(stop - start) / 1000} seconds`));