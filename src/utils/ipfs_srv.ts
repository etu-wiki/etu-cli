import fs from "fs";
import path from "path";
import { create } from "ipfs-core";
import { HttpGateway } from "ipfs-http-gateway";
import ora from "ora";
import yaml from "js-yaml";
import { cwd, __dirname, generateManifest, getIIIFVersion, getViewerName, registerShutdown, info, error, bold, warning, underline } from '../utils/common.js';
import open from "open";

const getAllFiles = (dirPath: string, originalPath: string, arrayOfFiles: any) => {
    const files = fs.readdirSync(dirPath);
    const folder = path.relative(originalPath, path.join(dirPath, "/"));

    const root = {
        path: folder.replace(/\\/g, "/"),
        mtime: fs.statSync(dirPath).mtime,
    };

    arrayOfFiles.push(root);

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(
                dirPath + "/" + file,
                originalPath,
                arrayOfFiles
            );
        } else {
            file = path.join(dirPath, "/", file);

            arrayOfFiles.push({
                path: path.relative(originalPath, file).replace(/\\/g, "/"),
                content: fs.readFileSync(file),
                mtime: fs.statSync(file).mtime,
            });
        }
    });

    return arrayOfFiles;
};

export async function start(rootPath: string, options: any, etuYaml: any) {
    const baseUrl = "http://localhost:9090/ipfs/";

    if (baseUrl !== etuYaml.presentBaseUrl) {
        console.log(info(`Generating Manifests`));
        generateManifest(rootPath, etuYaml, baseUrl, "");
        etuYaml.presentBaseUrl = baseUrl;
        etuYaml.imageBaseUrl = baseUrl;
        fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));
    }

    const start = Date.now();
    const ipfs = await create();
    const id = await ipfs.id();
    // console.log(id.id);
    const gateway = new HttpGateway(ipfs);
    await gateway.start();

    // const config = await ipfs.config.getAll();
    // const addresses = config.Addresses || { Swarm: [], Gateway: [] };
    // const gatewayAddrs = addresses?.Gateway || [];
    // console.log(gatewayAddrs);

    registerShutdown(async () => {
        await ipfs.stop();
        await gateway.stop();
    });

    const spinner = ora(`Adding to IPFS`).start();
    let etuCID;
    for await (const result of ipfs.addAll(getAllFiles(rootPath, path.resolve(rootPath, ".."), []), {
        cidVersion: 1,
    })) {
        if (result.path === "asset") {
            etuCID = result.cid;
            break;
        }
    }
    spinner.stop();

    const localUrl = `http://localhost:9090/ipfs/${etuCID}`;
    console.log(localUrl);
    const ipfsUrl = `https://dweb.link/ipfs/${etuCID}`;
    console.log(ipfsUrl);

    const stop = Date.now();
    let message = "\n" + info("IIIF for your own!\n");
    message += `\n${bold("- Time Cost:   ")}  ${(stop - start) / 1000} seconds`;
    message += `\n${bold("- IIIF Viewer: ")}  ${getViewerName(etuYaml.viewer)}`;
    message += `\n${bold("- IIIF Version:")}  ${getIIIFVersion(etuYaml.viewer)}`;
    message += `\n${bold("- CID:         ")}  ${etuCID}`;
    message += `\n${bold("- Local Url:   ")}  ${localUrl}`;
    message += `\n${bold("- IPFS Url:    ")}  ${ipfsUrl}`;

    console.log(message);
    open(localUrl);

    console.log("\n" + info("Press ^C at any time to quit."))
}

