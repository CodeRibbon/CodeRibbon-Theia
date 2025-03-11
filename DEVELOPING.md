## Getting started

Recommended to use [nvm](https://github.com/creationix/nvm#install-script).

Install npm and node.

```bash
nvm install v20
nvm use v20
```

Install yarn.

```bash
npm install -g yarn
```

## Gather dependencies / Initialize

In order to develop or build, ensure that you have [node-gyp](https://github.com/nodejs/node-gyp)'s dependencies installed.

Ubuntu:
```bash
sudo apt-get install -y python-setuptools libx11-dev libxkbfile-dev
```

OSX:
```bash
brew install python-setuptools libx11 libxkbfile
```

```bash
cd CodeRibbon-Theia
yarn
```

You may need additional libraries to build depending on what you are building.

## Developing locally

Start watching either type of build you're working with:

```bash
yarn watch:browser
# or
yarn watch:electron
```

> right now there seems to be a problem with the 'watch' automatic recompilation, for now just use `build:*` instead.

To build without watching, use `build:browser` or `build:electron` instead.

Start one of the apps with the respective `start:*` command.

You can change the port the browser app runs on like `yarn start:browser --port 4200`.

## Including default plugins

```bash
yarn download:plugins
```

Pulls down the Theia & VSCode plugins that are "built-in" in to the application when it's packaged.
