import fs from "fs";
import path from "path";

import handler from "serve-handler";
import yaml from "js-yaml";

import open from "open";

import {
  cwd,
  __dirname,
  patchViewer,
  generateManifest,
  registerShutdown,
  info,
  error,
  bold,
  warning,
  underline,
  staticBuild,
} from "../utils/common.mjs";
import { createServer as createHttpServer } from "http";
import { createServer as createSecureHttpSever } from "https";

// import { networkInterfaces } from "os";
// const interfaces: any = networkInterfaces();
// const getNetworkAddress = () => {
//     for (const name of Object.keys(interfaces)) {
//         for (const inter of interfaces[name]) {
//             const { address, family, internal } = inter;
//             if (family === "IPv4" && !internal) {
//                 return address;
//             }
//         }
//     }
// };

import openInEditor from "open-in-editor";
import livereload from "livereload";
import serveHandler from "serve-handler";

import {
  IMAGE_API_ENDPOINT,
} from "../config.mjs";

const start = Date.now();

function handleCookbook(rootPath, etuYaml) {
  const presentUuid = etuYaml.images[0].presentUuid;
  const cookbookPath = path.join(__dirname, "cookbook", presentUuid);
  // console.log("rootPath: " + rootPath);
  // console.log("cookbookPath: " + cookbookPath);

  fs.mkdirSync(path.join(rootPath, "p", presentUuid), { recursive: true });
  fs.copyFileSync(
    path.join(cookbookPath, "manifest.json"),
    path.join(rootPath, "p", presentUuid, "manifest.json")
  );

  fs.cpSync(path.join(__dirname, "viewer", etuYaml.viewer), rootPath, {
    recursive: true,
  });

  fs.writeFileSync(
    path.join(rootPath, "etu.json"),
    JSON.stringify({ iiifVersion: "3", images: [] })
  );
  console.log(info(`Patching viewer settings`));

  patchViewer(rootPath, [presentUuid], etuYaml.viewer);
}

export function run(rootPath, options, etuYaml) {
  console.log(info('Content: ' + rootPath))
  // let baseUrl = "http://localhost:3000";

  // etuYaml with name is etu project and should generate manifest and index.html
  if (options.cookbook) {
    handleCookbook(rootPath, etuYaml);
  }

  const severHandler = async (request, response) => {
    const config = {};

    config.public = rootPath;

    // to disploy thumbnail for etu project
    config.redirects = [
      // {
      //   source: `/i/:id/full/:width/0/default.${etuYaml.format}`,
      //   destination: `/i/:id.${etuYaml.format}`,
      // },
    ];

    // set CORS headers
    if (options.cors) {
      response.setHeader("Access-Control-Allow-Origin", "*");
    }
    // compress response
    // await compressionHandler(request, response);

    return handler(request, response, config);
  };

  const httpMode = options.sslCert && options.sslKey ? "https" : "http";
  const server =
    httpMode === "https"
      ? createSecureHttpSever(
          {
            key: fs.readFileSync(options.sslKey),
            cert: fs.readFileSync(options.sslCert),
          },
          severHandler
        )
      : createHttpServer(severHandler);

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && options.port)
      console.error(error(`Failed to etu: ${err.stack}`));
    process.exit(1);
  });

  server.listen(options.port, async () => {
    const details = server.address();

    registerShutdown(() => server.close());

    let localAddress = null;
    // let networkAddress = null;

    if (typeof details === "string") {
      localAddress = details;
    } else if (typeof details === "object" && details.port) {
      const address = details.address === "::" ? "localhost" : details.address;
      // const ip = getNetworkAddress();

      localAddress = `${httpMode}://${address}:${details.port}`;
      // networkAddress = ip ? `${httpMode}://${ip}:${details.port}` : null;
    }

    // regenerate manifest and etu-lock.yaml when localAddress changed
    if (localAddress !== "http://localhost:3000" && !options.cookbook) {
      if (etuYaml.isRemote) {
        etuYaml.imageBaseUrl = IMAGE_API_ENDPOINT;
      } else {
        etuYaml.imageBaseUrl = localAddress + "/i/";
      }

      console.log(info(`Generating Manifests`));
      etuYaml.presentBaseUrl = localAddress + "/p/";
      generateManifest(etuYaml);
      fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));

      // convert etuYaml to json and save to etu.json under public folder
      fs.writeFileSync(
        `${__dirname}/app/etu.json`,
        JSON.stringify(etuYaml, null, 2)
      );

      staticBuild();
    }

    const stop = Date.now();

    if (process.stdout.isTTY && process.env.NODE_ENV !== "production") {
      let message = info(`Accepting connections on ${localAddress}\n`);
      message += `\n${bold("- Startup Time:")}  ${
        (stop - start) / 1000
      } seconds`;
      message += `\n${bold("- IIIF Version:")}  ${etuYaml.iiifVersion}`;
      message += "\n";
      if (parseInt(options.port) !== details.port) {
        message += warning(
          `This port was picked because ${underline(options.port)} is in use.`
        );
      }
      console.log(message);
    } else {
      const suffix = localAddress ? ` at ${localAddress}` : "";
      console.log(info(`Accepting connections${suffix}`));
    }

    // etuYaml with name is etu project and should generate manifest and index.html
    if (options.cookbook) {
      open(localAddress + `/${etuYaml.viewer}.html`);
    } else {
      open(localAddress);
    }

    if (options.modifyManifest) {
      const editor = openInEditor.configure({
        editor: options.editor,
      });
      etuYaml.images.forEach(async (e) => {
        await editor.open(
          path.join(rootPath, `p/${e.presentUuid}/manifest.json`)
        );
      });
      console.log(
        info(
          "If you can't see your change in the viewer, please reload the page"
        ) + "\n"
      );

      const lrserver = livereload.createServer({ exts: ["json"] });
      lrserver.watch(rootPath);
    }

    console.log("\n" + info("Press ^C at any time to quit."));
  });

  registerShutdown(() => {
    console.log(`\n${info("Gracefully shutting down. Please wait...")}`);

    process.on("SIGINT", () => {
      console.log(`\n${warning("Force-closing all open sockets...")}`);
      process.exit(0);
    });
  });
}
