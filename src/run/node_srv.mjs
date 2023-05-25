import fs from "fs";
import path from "path";

import handler from "serve-handler";
import yaml from "js-yaml";

import compression from "compression";
import { promisify } from "util";
const compressionHandler = promisify(compression());

import { IMAGE_API_ENDPOINT } from "../config.mjs";

import open from "open";

import {
  cwd,
  __dirname,
  generateManifest,
  patchViewer,
  getIIIFVersion,
  getViewerName,
  registerShutdown,
  info,
  error,
  bold,
  warning,
  underline,
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

const start = Date.now();

function generateCookbookManifest(rootPath, etuYaml) {
  const presentUuid = etuYaml.images[0].presentUuid;
  const cookbookPath = path.join(__dirname, "cookbook", presentUuid);

  if (!fs.existsSync(rootPath)) {
    const res = fs.mkdirSync(rootPath, { recursive: true });
    console.log(res);
    fs.cpSync(path.join(__dirname, "viewer", etuYaml.viewer), rootPath, {
      recursive: true,
    });
  }

  fs.mkdirSync(path.join(rootPath, "p", "3", presentUuid), { recursive: true });
  fs.copyFileSync(
    path.join(cookbookPath, "manifest.json"),
    path.join(rootPath, "p", "3", presentUuid, "manifest.json")
  );

  console.log(info(`Patching viewer settings`));
  const indexPath = path.join(rootPath, "index.html");

  patchViewer(indexPath, [presentUuid], [], etuYaml.viewer);
}

export function run(rootPath, options, etuYaml) {
  const iiifVersion = getIIIFVersion(etuYaml.viewer);

  const severHandler = async (request, response) => {
    const config = {};

    config.public = rootPath;

    // to disploy thumbnail for etu project
    config.redirects = [
      {
        source: `/i/${iiifVersion}/:id/full/:width/0/default.${etuYaml.format}`,
        destination: `/i/${iiifVersion}/:id/thumbnail.${etuYaml.format}`,
      },
    ];

    // set CORS headers
    if (options.cors) {
      response.setHeader("Access-Control-Allow-Origin", "*");
    }
    // compress response
    await compressionHandler(request, response);

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

    console.log(info(`Accepting connections on ${localAddress}`));

    const baseUrl = `${httpMode}://localhost:${details.port}`;
    let url = `${baseUrl}/index.html`;

    const stop = Date.now();
    if (process.stdout.isTTY && process.env.NODE_ENV !== "production") {
      let message = info("IIIF for your OWN!\n");
      message += `\n${bold("- Time Cost:   ")}  ${
        (stop - start) / 1000
      } seconds`;
      message += `\n${bold("- IIIF Viewer: ")}  ${getViewerName(
        etuYaml.viewer
      )}`;
      message += `\n${bold("- IIIF Version:")}  ${iiifVersion}`;
      message += `\n${bold("- Viewer Url:  ")}  ${url}`;
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
      generateCookbookManifest(rootPath, etuYaml);
    } else {
      let imageBaseUrl
      if(options.remote) {
        imageBaseUrl = IMAGE_API_ENDPOINT;
      } else {
        imageBaseUrl = baseUrl + '/i/' + getIIIFVersion(etuYaml.viewer);
      }
      if (baseUrl !== etuYaml.presentBaseUrl || imageBaseUrl !== etuYaml.imageBaseUrl) {
        console.log(info(`Generating Manifests`));
        etuYaml.presentBaseUrl = baseUrl + '/p/' + getIIIFVersion(etuYaml.viewer);
        etuYaml.imageBaseUrl = imageBaseUrl

        generateManifest(rootPath, etuYaml, options.remote);

        fs.writeFileSync(`${cwd}/etu-lock.yaml`, yaml.dump(etuYaml));
      }
    }

    open(url);

    if (options.modifyManifest) {
      const editor = openInEditor.configure({
        editor: options.editor,
      });
      etuYaml.images.forEach(async (e) => {
        await editor.open(
          path.join(rootPath, `p/${iiifVersion}/${e.presentUuid}/manifest.json`)
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

    if (options.modifyViewer) {
      const editor = openInEditor.configure({
        editor: options.editor,
      });
      await editor.open(path.join(rootPath, "index.html"));
      console.log(
        info(
          "After editing viewer settings, please reload the page to see the changes."
        ) + "\n"
      );
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
