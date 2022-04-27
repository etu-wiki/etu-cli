#!/usr/bin/env node

// Native
import fs from "fs";
import path from "path";
import { createServer as createHttpServer } from "http";
import { createServer as createSecureHttpSever } from "https";
import { resolve } from "path";
import { rmSync, existsSync, unlinkSync, readFileSync } from "fs";
import { promisify } from "util";
import { networkInterfaces, homedir } from "os";



// Packages
import chalk from "chalk";
import arg from "arg";
import handler from "serve-handler";
import boxen from "boxen";
import compression from "compression";
import inquirer from "inquirer";
import open from "open";
import generateIIIF from "./iiif.js";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utilities
const compressionHandler = promisify(compression());
const interfaces = networkInterfaces();

const warning = (message) => `${chalk.yellow(" WARNING:")} ${message}`;
const info = (message) => `${chalk.magenta(" INFO:")} ${message}`;
const error = (message) => `${chalk.red(" ERROR:")} ${message}`;

const ETU_PATH = homedir + "/etu/";

let publicPath;

const getHelp = () => chalk`
  eut - present your IIIF image on the fly

  USAGE

      $ etu --help
      $ etu [image_folder | image_file]
      $ etu [-p listen_port] [image_folder | image_file]

      By default, etu will listen on localhost:3000 and serving the
      current working directory on that address.

  OPTIONS

      --help                              Shows this help message

      --cookbook                          Run IIIF Cookbook recipe in etu

      -p, --port                          Specify a port on which to listen

      -C, --cors                          Enable CORS, sets \`Access-Control-Allow-Origin\` to \`*\`
	  
	  --ssl-cert                          Optional path to an SSL/TLS certificate to etu with HTTPS
	  
	  --ssl-key                           Optional path to the SSL/TLS certificate\'s private key

      --no-port-switching                 Do not open a port other than the one specified when it\'s taken.
`;

const clearWorkingFolder = () => {
  if (publicPath == ETU_PATH) {
    rmSync(publicPath + "i", { recursive: true, force: true });
    rmSync(publicPath + "p", { recursive: true, force: true });
  }
  if (existsSync(publicPath + "viewer")) {
    rmSync(publicPath + "viewer", { recursive: true, force: true });
  }
};

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

const startEndpoint = async (port, config, args, previous) => {
  const start = Date.now();

  const cwd = process.cwd();
  const entry = args._.length > 0 ? resolve(args._[0]) : cwd;

  let viewer = args["--viewer"] || "m3";
  let viewerName = "Mirador 3";
  let iiifVersion = 3;

  // Nevigate to index if file not found
  config.rewrites = [
    {
      source: "**",
      destination: "/viewer/index.html",
    },
  ];

  const { isTTY } = process.stdout;
  const httpMode = args["--ssl-cert"] && args["--ssl-key"] ? "https" : "http";

  let url;
  const baseUrl = `${httpMode}://localhost:${port}`;
  if (args["--cookbook"]) {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "cookbook",
        message: "Which recipe would you like to choose?",
        choices: ["Single Image File", "Single Audio File", "Single Video File"],
      },
    ]);

    publicPath = __dirname + `/../cookbook/${answer.cookbook.replace(/\s/g, '_').toLowerCase()}/`;
    url =
      baseUrl +
      "/viewer/index.html?manifest=" +
      baseUrl +
      "/manifest.json";
    open(url);
  } else {
    // generate IIIF content
    publicPath = ETU_PATH;
    url = await generateIIIF(entry, viewer, iiifVersion, baseUrl);
    open(url);
  }

  config.public = publicPath;

  if (existsSync(publicPath + "viewer")) {
    rmSync(publicPath + "viewer", { recursive: true, force: true });
  }
  fs.cpSync(
    __dirname + "/../viewer/" + viewer,
    publicPath + "viewer",
    {recursive: true}
  );

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
      const address = details.address === "::" ? "localhost" : details.address;
      const ip = getNetworkAddress();

      localAddress = `${httpMode}://${address}:${details.port}`;
      networkAddress = ip ? `${httpMode}://${ip}:${details.port}` : null;
    }
    console.log(info(`Accepting connections on ${localAddress}`));
    try {
      const stop = Date.now();
      if (isTTY && process.env.NODE_ENV !== "production") {
        let message = chalk.green("Present your IIIF image on the fly!\n");
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
        console.log(
          boxen(message, {
            padding: 1,
            borderColor: "green",
            margin: 1,
          })
        );
      } else {
        const suffix = localAddress ? ` at ${localAddress}` : "";
        console.log(info(`Accepting connections${suffix}`));
      }
    } catch (err) {
      console.log(error(err.message));
    }
  });
};

clearWorkingFolder();

let args = null;

try {
  args = arg({
    "--help": Boolean,
    "--viewer": String,
    "--cookbook": Boolean,
    "--port": String,
    "--cors": Boolean,
    "--no-port-switching": Boolean,
    "--ssl-cert": String,
    "--ssl-key": String,
    "-h": "--help",
    "-v": "--viewer",
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

if (!args["--port"]) {
  // Default endpoint
  args["--port"] = process.env.PORT || 3000;
}

if (args._.length > 1) {
  console.error(error("Please provide one path argument at maximum"));
  process.exit(1);
}

const config = {};
config.etag = true;
config.symlinks = true;
config.cleanUrls = false;

await startEndpoint(args["--port"], config, args);

registerShutdown(() => {
  console.log(`\n${info("Gracefully shutting down. Please wait...")}`);
  clearWorkingFolder();
  process.on("SIGINT", () => {
    console.log(`\n${warning("Force-closing all open sockets...")}`);
    process.exit(0);
  });
});
