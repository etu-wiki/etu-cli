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
const editor = openInEditor.configure({
  editor: "code",
});
import { fileURLToPath } from "url";
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

      --help                              Shows this help message

      -v, --version                       Displays the current version of serve

      --cookbook                          Run IIIF Cookbook recipe in etu

      -V, --viewer                        Choose the viewer: m3(mirador3), uv(universal viewer)

      -i, --import                        Import etu bundle from a local file (extension not included)
      
      -e, --export                        Export etu bundle to a local file (extension not included)

      -d, --durable                       Don't delete the temporary directory after the process ends
      
      -c, --clear                         Clear the temporary directory existed from last session

      -p, --port                          Specify a port on which to listen

      -C, --cors                          Enable CORS, sets \`Access-Control-Allow-Origin\` to \`*\`
	  
      --ssl-cert                          Optional path to an SSL/TLS certificate to etu with HTTPS
	  
      --ssl-key                           Optional path to the SSL/TLS certificate\'s private key

      --no-port-switching                 Do not open a port other than the one specified when it\'s taken.

      --ipfs                              Export IIIF content to IPFS
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
  const baseUrl = `${httpMode}://localhost:${port}`;

  let viewer = args["--viewer"] || "m3";
  let viewerName = "Mirador 3";
  let iiifVersion = 3;

  switch (viewer) {
    case "m3":
      viewerName = "Mirador 3";
      iiifVersion = "3";
      break;
    case "uv":
      viewerName = "Universal Viewer";
      iiifVersion = "2";
      break;
    default:
      throw Error("invalid viewer type");
  }

  if (existsSync(ETU_PATH)) {
    console.log(info("loading existing etu bundle"));
    console.log(info("use --clear to delete the existing etu bundle"));
  } else {
    // preparing raw material
    if (args["--import"]) {
      const importFileName = args["--import"] + ".etu";
      await tar.x({ file: importFileName, C: homedir + "/" });
      console.log(homedir + "/");
    } else {
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
              "0009-book-1",
              "0010-book-2-viewing-direction",
              "0013-placeholderCanvas",
              "0014-accompanyingcanvas",
              "0015-start",
              "0024-book-4-toc",
              "0046-rendering",
              "0117-add-image-thumbnail",
              "0139-geolocate-canvas-fragment",
              "0219-using-caption-file",
              "0202-start-canvas",
              "0230-navdate",
              "0234-provider",
            ],
          },
        ]);

        const cookbookPath = __dirname + `/../cookbook/${answer.cookbook}/`;
        function traverseFolder(dirPath, list = []) {
          readdirSync(dirPath).forEach(function (item) {
            let fullpath = path.join(dirPath, item);
            let stats = statSync(fullpath);
            if (stats.isDirectory()) {
              traverseFolder(fullpath, list);
            } else {
              list.push(fullpath);
            }
          });
          return list;
        }
        const jsonList = traverseFolder(cookbookPath);
        console.log(jsonList);
        for (let i = 0; i < jsonList.length; i++) {
          copyFileSync(jsonList[i], ETU_PATH + "manifest.json");
        }
      } else {
        const cwd = process.cwd();
        // const entry = args._.length > 0 ? resolve(args._[0]) : cwd;
        if (args._[0]) {
          // generate IIIF content
          await generateIIIF(resolve(args._[0]), iiifVersion, baseUrl);
        }
      }

      cpSync(__dirname + "/../viewer/" + viewer, ETU_PATH, { recursive: true });
    }
  }

  if (args["--export"]) {
    let exportFileName = args["--export"] || "etu";
    await tar.c(
      { gzip: true, C: homedir + "/", file: exportFileName + ".etu" },
      ["etu"]
    );
  }

  if (args["--ipfs"]) {
    if (viewer === "m3") {
      const ipfs = await create();
      const id = await ipfs.id();
      console.log(id.id);
      const gateway = new HttpGateway(ipfs);
      await gateway.start();

      const config = await ipfs.config.getAll();
      const addresses = config.Addresses || { Swarm: [], Gateway: [] };
      const gatewayAddrs = addresses?.Gateway || [];
      console.log(gatewayAddrs);

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
      const ipfsUrl = `https://ipfs.io/ipfs/${etuCID}`;
      console.log(localUrl);
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
      // console.log(
      //   boxen(message, {
      //     padding: 1,
      //     borderColor: "green",
      //     margin: 1,
      //   })
      // );
      console.log(message);
      open(localUrl);
    } else {
      console.log(warning(`Currenntly IPFS support Mirador3 only.`));
    }
  } else {
    // Nevigate to index if file not found
    config.rewrites = [
      {
        source: "**",
        destination: "/viewer/index.html",
      },
    ];

    if (iiifVersion === "2") {
      config.redirects = [
        {
          source: "/i/2/:id/full/:width/0/default.jpg",
          destination: "/i/2/:id.jpg",
        },
      ];
    }

    const { isTTY } = process.stdout;
    const url = baseUrl + "/index.html";

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
          // console.log(
          //   boxen(message, {
          //     padding: 1,
          //     borderColor: "green",
          //     margin: 1,
          //   })
          // );
          console.log(message);
        } else {
          const suffix = localAddress ? ` at ${localAddress}` : "";
          console.log(info(`Accepting connections${suffix}`));
        }
      } catch (err) {
        console.log(error(err.message));
      }
      await editor.open(ETU_PATH + "manifest.json");
      open(url);
    });
  }
};

let args = null;

try {
  args = arg({
    "--help": Boolean,
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
    "-h": "--help",
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

  process.on("SIGINT", () => {
    console.log(`\n${warning("Force-closing all open sockets...")}`);
    process.exit(0);
  });
});
