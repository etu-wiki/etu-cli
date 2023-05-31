# ETU CLI Pro
## Introduction
ETU CLI Pro is a local first IIIF solution to present your images. It converts them into IIIF compatible format and launch local http server to be interacted with.
<p>
ETU supports IIIF viewers such as Mirador 2, Mirador 3, Universal Viewer 3, Universal Viewer 4, CloverIIIF. 
<p>
In addition to local run, ETU also integrates a serverless IIIF image server that emulate local viewing experience by inherited multi-layer cache design. High resolution images larger than 10000 x 10000 pixel is capable of being rendered smoothly without any perceptional delay. Popular image format like jp2 is supported out of box, while raw image can be compressed in storage efficient manner that only occupies 10% of the original storage volume.
<p>
ETU ❤️ IIIF. We endeavor to democratizing IIIF technical stack to everyone who loves it.
<br />
<br />

## Local Run
You can use [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/en/) to install ETU, which requires [Node.js LTS](https://nodejs.org) at least: 

```bash
npm install -g etu-cli
```
```bash
yarn global add etu-cli
```
<br />
There three steps to go before launching a local IIIF enabled web server:
<p>
First, initialize etu project in any empty folder in your local machine by.
```bash
etu init
```

Second, covert source images to a IIIF-oriented format.
```bash
etu import
```

Third, launch local web server equipped with images in IIIF image API and presentation API.
```bash
etu run
```
<br />

## Remote Run
To use the new serverless IIIF image server, first register a user account
```bash
etu login
```

Then change imported images or reimport images in remote mode
```bash
etu import -r
```

Then publish images to image server and let the server to smartly decide whether to compress images
```bash
etu publish
```

For large images, you can check processing status by
```bash
etu status
```

Finally run the local server with IIIF images serving from the serverless IIIF image server
```bash
etu run
```
<br />

## Advance usage
Use following command to lively update manifest file
```bash
etu run -m
```
<p>
At any command level, use -h or --help to familiarize yourself with ETU and improve your skills.

<p>
Issue or pull request is always welcome!
<br />
<br />
<br />

## Contributing
Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the etu-cli Project (`https://github.com/etu-wiki/etu-cli`)
2. Create your Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit your Changes (`git commit -a -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request