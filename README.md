# ETU CLI
## Introduction
ETU CLI is an open source command line tool to present your local IIIF images. It converts your images to web compatible format and launch local http server to interact.
Currently IIIF viewers supported by ETU including Mirador 2, Mirador 3, Universal Viewer 3, Universal Viewer 4. IIIF Image Server such as IIP or Cantaloupe is also on our to-do list.
ETU ❤️ IIIF. We endeavor to democratizing IIIF technical stack to everyone who loves it.
<br />
<br />
## Usage
You can use [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/en/) to install ETU, which requires [Node.js LTS](https://nodejs.org) at least: 

```bash
npm install -g etu-cli
```
```bash
yarn global add etu-cli
```
<br />
There three steps to go before launching a local IIIF enabled web server:

First, initialize etu project in any empty folder in your local machine by
```bash
etu init
```
You will be asked a series of questions regarding to where is your images and other settings

Second, covert source images to a web-oriented format which might be time consuming:
```bash
etu install
```

Third, launch local web server equipped with images in IIIF image API and presentation API
```bash
etu run
```
<br />

For advance user, use following command to lively update manifest file which changes image presentation
```bash
etu run -m
```
or update the IIIF viewer setting which impact the viewer's theme and appearence
```bash
etu run -V
```
<br />
At any command level, use -h or --help to familar yourself with ETU and improve your skills.

<br />
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