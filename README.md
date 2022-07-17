# etu-cli
A command line to present your own IIIF images!
Offline first
Democratizing IIIF for everyone
## Usage
You can also use [npm](https://www.npmjs.com/) instead, if you'd like:

```bash
npm install -g etu-cli
```

If you prefer, you can also install the package globally using [Yarn](https://yarnpkg.com/en/) (you'll need at least [Node.js LTS](https://nodejs.org/en/)):

```bash
yarn global add etu-cli
```

Once that's done, you can specify which folder you want to serve:

```bash
etu folder_name
```

...or specify a image file you want to serve:

```bash
etu sample.jpg
```

You can also import/export etu files to one package file which is portable

```bash
etu sample.jpg --export sample
```
```bash
etu --import sample
```

Publish ETU image to IPFS while launching a local IPFS gateway

```bash
etu sample.jpg --ipfs
```

Publish ETU image to web3.storage with a personal token

```bash
etu sample.jpg --web3 token
```

By default etu files will be cleared each time local server is closed. To avoid that, use --durable option

```bash
etu sample.jpg --durable
```

To resume durable etu session, use previous cmd again or simple use etu --durable

```bash
etu --durable
```

To clear etu session, use previous cmd again or simple use etu --durable
```bash
etu --clear
```

Finally, run this command to see a list of all available options:

```bash
etu --help
```
## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the etu-cli Project (`https://github.com/etu-wiki/etu-cli`)
2. Create your Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit your Changes (`git commit -a -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request