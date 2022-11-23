#!/usr/bin/env node

// Native
import path from "path";
import tar from "tar";
import { createServer as createHttpServer } from "http";
import { createServer as createSecureHttpSever } from "https";
import { resolve } from "path";
import {
  rmSync,
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  cpSync,
} from "fs";
import { promisify } from "util";
import { networkInterfaces, homedir } from "os";

// Packages
import ora from "ora";
import chalk from "chalk";
import arg from "arg";
import handler from "serve-handler";
import compression from "compression";
import inquirer from "inquirer";
import open from "open";
import generateIIIF from "./iiif.js";
import { create } from "ipfs-core";
import { HttpGateway } from "ipfs-http-gateway";
import openInEditor from "open-in-editor";
import { fileURLToPath } from "url";
import livereload from "livereload";

import { Web3Storage, getFilesFromPath } from "web3.storage";
import { NFTStorage } from "nft.storage";
import { filesFromPath } from "files-from-path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(readFileSync(__dirname + "/../package.json"));
// Utilities
const compressionHandler = promisify(compression());
const interfaces = networkInterfaces();

const warning = (message) => `${chalk.yellow("WARNING:")} ${message}`;
const info = (message) => `${chalk.magenta("INFO:")} ${message}`;
const error = (message) => `${chalk.red("ERROR:")} ${message}`;

const ETU_PATH = homedir + "/etu/";

const getHelp = () => chalk`
  eut - IIIF for your own

  USAGE

      $ etu --help
      $ etu [image_folder | image_file]
      $ etu [-p listen_port] [image_folder | image_file]

      By default, etu will listen on localhost:3000 and serving the
      current working directory on that address.

  OPTIONS

      -h, --help                          Shows this help message

      -v, --version                       Displays the current version of serve

      --cookbook                          Run IIIF Cookbook recipe in etu

      -V, --viewer                        Choose the viewer:  m2(mirador 2), m3(mirador3), u3(universal viewer 3), u4(universal viewer 4)

      -m, --manifest                      Open manifest in your favorite editor, such as 'sublime', 'atom', 'code', 'webstorm', 'phpstorm', 'idea14ce', 'vim', 'emacs', 'visualstudio'

      -i, --import                        Import etu bundle from a local file (extension not included)
      
      -e, --export                        Export etu bundle to a local file (extension not included)

      -d, --durable                       Don't delete the temporary directory after the process ends
      
      -c, --clear                         Clear the temporary directory existed from last session

      -p, --port                          Specify a port on which to listen

      -C, --cors                          Enable CORS, sets \`Access-Control-Allow-Origin\` to \`*\`
	  
      --ssl-cert                          Optional path to an SSL/TLS certificate to etu with HTTPS
	  
      --ssl-key                           Optional path to the SSL/TLS certificate\'s private key

      --no-port-switching                 Do not open a port other than the one specified when it\'s taken

      --ipfs                              Start a local IPFS gateway and export IIIF content to IPFS

      --web3                              Publish etu image to web3.storage. Please add the token as a parameter

      --nft                               Publish etu image to nft.storage. Please add the token as a parameter
`;

const registerShutdown = (fn) => {
  let run = false;

  const wrapper = () => {
    if (!run) {
      run = true;
      fn();
    }
  };

  process.on("SIGINT", wrapper);
  process.on("SIGTERM", wrapper);
  process.on("exit", wrapper);
};

const getNetworkAddress = () => {
  for (const name of Object.keys(interfaces)) {
    for (const inter of interfaces[name]) {
      const { address, family, internal } = inter;
      if (family === "IPv4" && !internal) {
        return address;
      }
    }
  }
};

const getAllFiles = (dirPath, originalPath, arrayOfFiles) => {
  const files = readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];
  originalPath = originalPath || path.resolve(dirPath, "..");

  const folder = path.relative(originalPath, path.join(dirPath, "/"));

  const root = {
    path: folder.replace(/\\/g, "/"),
    mtime: statSync(dirPath).mtime,
  };

  arrayOfFiles.push(root);

  files.forEach(function (file) {
    if (statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(
        dirPath + "/" + file,
        originalPath,
        arrayOfFiles
      );
    } else {
      file = path.join(dirPath, "/", file);

      arrayOfFiles.push({
        path: path.relative(originalPath, file).replace(/\\/g, "/"),
        content: readFileSync(file),
        mtime: statSync(file).mtime,
      });
    }
  });

  return arrayOfFiles;
};

const startEndpoint = async (port, config, args, previous) => {
  const start = Date.now();

  const httpMode = args["--ssl-cert"] && args["--ssl-key"] ? "https" : "http";

  let viewer = args["--viewer"] || "m3";
  let viewerName = "Mirador 3";
  let iiifVersion = 3;

  switch (viewer) {
    case "m2":
      viewerName = "Mirador 2";
      iiifVersion = "2";
      break;
    case "m3":
      viewerName = "Mirador 3";
      iiifVersion = "3";
      break;
    case "u3":
      viewerName = "Universal Viewer 3";
      iiifVersion = "2";
      break;
    case "u4":
      viewerName = "Universal Viewer 4";
      iiifVersion = "3";
      break;
    default:
      throw Error("invalid viewer type");
  }

  if (existsSync(ETU_PATH)) {
    console.log(info("loading existed etu bundle"));
    console.log(info("use --clear to delete the existing etu bundle"));
  } else {
    cpSync(__dirname + "/../viewer/" + viewer, ETU_PATH, { recursive: true });
  }

  if (args["--export"]) {
    let exportFileName = args["--export"] || "etu";
    await tar.c(
      { gzip: true, C: homedir + "/", file: exportFileName + ".etu" },
      ["etu"]
    );
    return;
  }

  // preparing raw material
  if (args["--import"]) {
    const importFileName = args["--import"] + ".etu";
    await tar.x({ file: importFileName, C: homedir + "/" });
    console.log(homedir + "/");
    return;
  }

  // load cookbook manifest files
  if (args["--cookbook"]) {
    mkdirSync(ETU_PATH, { recursive: true });
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "cookbook",
        message: "Which recipe would you like to choose?",
        choices: [
          "0001-mvm-image",
          "0002-mvm-audio",
          "0003-mvm-video",
          "0004-canvas-size",
          "0005-image-service",
          "0006-text-language",
          "0007-string-formats",
          "0008-rights",
          "0009-book-1",
          "0010-book-2-viewing-direction",
          "0011-book-3-behavior",
          "0013-placeholderCanvas",
          "0014-accompanyingcanvas",
          "0015-start",
          "0017-transcription-av",
          "0021-tagging",
          "0024-book-4-toc",
          "0026-toc-opera",
          "0029-metadata-anywhere",
          "0030-multi-volume",
          "0033-choice",
          "0035-foldouts",
          "0036-composition-from-multiple-images",
          "0046-rendering",
          "0053-seeAlso",
          "0064-opera-one-canvas",
          "0065-opera-multiple-canvases",
          "0068-newspaper",
          "0074-multiple-language-captions",
          "0117-add-image-thumbnail",
          // "0139-geolocate-canvas-fragment",  # not implemented yet
          "0219-using-caption-file",
          "0202-start-canvas",
          "0230-navdate",
          "0232-image-thumbnail-canvas-1",
          "0232-image-thumbnail-canvas-2",
          "0234-provider",
          // "0258-tagging-external-resource",  # not implemented yet
          "0261-non-rectangular-commenting",
          "0266-full-canvas-annotation",
          "0269-embedded-or-referenced-annotations",
        ],
      },
    ]);

    const cookbookPath = __dirname + `/../cookbook/${answer.cookbook}/`;
    copyFileSync(cookbookPath + "manifest.json", ETU_PATH + "manifest.json");
  }


  // const cwd = process.cwd();
  // const entry = args._.length > 0 ? resolve(args._[0]) : cwd;
  // if (args._[0]) {
  //   // generate IIIF content
  //   const baseUrl = `${httpMode}://localhost:${port}`;
  //   await generateIIIF(resolve(args._[0]), iiifVersion, baseUrl);
  // }

  // start http server locally
  if (!args["--web3"] && !args["--nft"] && !args["--ipfs"]) {
    console.log(info('Starting local web server'))
    // navigate to index if file not found
    config.rewrites = [
      {
        source: "**",
        destination: "/viewer/index.html",
      },
    ];

    // to disploy thumbnail for uv properly
    if (viewer === "u3" || viewer === "u4" || viewer === "m2") {
      config.redirects = [
        {
          source: `/i/${iiifVersion}/:id/full/:width/0/default.jpg`,
          destination: `/i/${iiifVersion}/:id.jpg`,
        },
      ];
    }

    const { isTTY } = process.stdout;

    mkdirSync(ETU_PATH, { recursive: true });

    config.public = ETU_PATH;

    const severHandler = async (request, response) => {
      if (args["--cors"]) {
        response.setHeader("Access-Control-Allow-Origin", "*");
      }
      await compressionHandler(request, response);

      return handler(request, response, config);
    };

    const server =
      httpMode === "https"
        ? createSecureHttpSever(
            {
              key: readFileSync(args["--ssl-key"]),
              cert: readFileSync(args["--ssl-cert"]),
            },
            severHandler
          )
        : createHttpServer(severHandler);

    server.on("error", (err) => {
      if (
        err.code === "EADDRINUSE" &&
        !isNaN(port) &&
        args["--no-port-switching"] !== true
      ) {
        startEndpoint(0, config, args, port);
        return;
      }

      console.error(error(`Failed to etu: ${err.stack}`));
      process.exit(1);
    });

    server.listen(port, async () => {
      const details = server.address();
      registerShutdown(() => server.close());

      let localAddress = null;
      let networkAddress = null;

      if (typeof details === "string") {
        localAddress = details;
      } else if (typeof details === "object" && details.port) {
        const address =
          details.address === "::" ? "localhost" : details.address;
        const ip = getNetworkAddress();

        localAddress = `${httpMode}://${address}:${details.port}`;
        networkAddress = ip ? `${httpMode}://${ip}:${details.port}` : null;
      }

      console.log(info(`Accepting connections on ${localAddress}`));


      const baseUrl = `${httpMode}://localhost:${details.port}`;
      const url = `${baseUrl}/index.html`;
      await generateIIIF(resolve(args._[0]), iiifVersion, baseUrl);

      try {
        const stop = Date.now();
        if (isTTY && process.env.NODE_ENV !== "production") {
          let message = chalk.green("\nIIIF for your own!\n");
          message += `\n${chalk.bold("- Time Cost:   ")}  ${
            (stop - start) / 1000
          } seconds`;
          message += `\n${chalk.bold("- IIIF Viewer: ")}  ${viewerName}`;
          message += `\n${chalk.bold("- IIIF Version:")}  ${iiifVersion}`;
          message += `\n${chalk.bold("- Viewer Url:  ")}  ${url}`;
          if (previous) {
            message += chalk.red(
              `\n\nThis port was picked because ${chalk.underline(
                previous
              )} is in use.`
            );
          }
          console.log(message);
        } else {
          const suffix = localAddress ? ` at ${localAddress}` : "";
          console.log(info(`Accepting connections${suffix}`));
        }
      } catch (err) {
        console.log(error(err.message));
      }

      open(url);

      if (args["--manifest"]) {
        const editor = openInEditor.configure({
          editor: args["--manifest"],
        });
        await editor.open(ETU_PATH + "manifest.json");
        const lrserver = livereload.createServer({ exts: ["json"] });
        lrserver.watch(ETU_PATH);
      }
    });
  } else {
    const baseUrl = `${httpMode}://localhost:${port}`;
    await generateIIIF(resolve(args._[0]), iiifVersion, baseUrl);

    if (args["--web3"]) {
      const storage = new Web3Storage({ token: args["--web3"] });
      const files = await getFilesFromPath(ETU_PATH);
      console.log(`Uploading ${files.length} files`);
      const cid = await storage.put(files, {
        name: "etu",
        wrapWithDirectory: false,
      });
      console.log("Content added with CID:", cid);
      const ipfsUrl = `https://dweb.link/ipfs/${cid}`;
      console.log(ipfsUrl);
      open(ipfsUrl);
      return;
    }
  
    if (args["--nft"]) {
      const client = new NFTStorage({ token: args["--nft"] });
      console.log(path.resolve(ETU_PATH));
      const files = filesFromPath(ETU_PATH, {
        pathPrefix: path.resolve(ETU_PATH), // see the note about pathPrefix below
        hidden: true, // use the default of false if you want to ignore files that start with '.'
      });
      console.log(`Uploading ${files} files`);
      const cid = await client.storeDirectory(files);
      console.log("Content added with CID:", cid);
      const ipfsUrl = `https://${cid}.ipfs.nftstorage.link`;
      console.log(ipfsUrl);
      open(ipfsUrl);
      return;
    }
  
    if (args["--ipfs"]) {
      if (viewer === "m3") {
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
        for await (const result of ipfs.addAll(getAllFiles(ETU_PATH), {
          cidVersion: 1,
        })) {
          if (result.path === "etu") {
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
        let message = chalk.green("\nIIIF for your own!\n");
        message += `\n${chalk.bold("- Time Cost:   ")}  ${
          (stop - start) / 1000
        } seconds`;
        message += `\n${chalk.bold("- IIIF Viewer: ")}  ${viewerName}`;
        message += `\n${chalk.bold("- IIIF Version:")}  ${iiifVersion}`;
        message += `\n${chalk.bold("- CID:         ")}  ${etuCID}`;
        message += `\n${chalk.bold("- Local Url:   ")}  ${localUrl}`;
        message += `\n${chalk.bold("- IPFS Url:    ")}  ${ipfsUrl}`;
  
        console.log(message);
        open(localUrl);
      } else {
        console.log(warning(`Currenntly IPFS support Mirador3 only.`));
      }
    }
  }



};

let args = null;

try {
  args = arg({
    "--help": Boolean,
    "--manifest": String,
    "--version": Boolean,
    "--durable": Boolean,
    "--clear": Boolean,
    "--viewer": String,
    "--import": String,
    "--export": String,
    "--cookbook": Boolean,
    "--port": String,
    "--cors": Boolean,
    "--no-port-switching": Boolean,
    "--ssl-cert": String,
    "--ssl-key": String,
    "--ipfs": Boolean,
    "--web3": String,
    "--nft": String,
    "-h": "--help",
    "-m": "--manifest",
    "-v": "--version",
    "-d": "--durable",
    "-c": "--clear",
    "-V": "--viewer",
    "-i": "--import",
    "-e": "--export",
    "-C": "--cors",
    "-p": "--port",
  });
} catch (err) {
  console.error(error(err.message));
  process.exit(1);
}

if (args["--help"]) {
  console.log(getHelp());
  process.exit(0);
}

if (args["--version"]) {
  console.log(pkg.version);
  process.exit(0);
}

if (!args["--port"]) {
  // Default endpoint
  args["--port"] = process.env.PORT || 3000;
}

// if (args._.length > 1) {
//   console.error(error("Please provide one path argument at maximum"));
//   process.exit(1);
// }

if (args["--clear"]) {
  rmSync(ETU_PATH, { recursive: true, force: true });
  process.exit(0);
}

const config = {};
config.etag = true;
config.symlinks = true;
config.cleanUrls = false;

await startEndpoint(args["--port"], config, args);

registerShutdown(() => {
  console.log(`\n${info("Gracefully shutting down. Please wait...")}`);
  if (!args["--durable"]) {
    rmSync(ETU_PATH, { recursive: true, force: true });
  }

  if (args["--manifest"]) {
    // while livereload is on, exit directly without waiting
    process.exit(0);
  } else {
    process.on("SIGINT", () => {
      console.log(`\n${warning("Force-closing all open sockets...")}`);
      process.exit(0);
    });
  }
});
