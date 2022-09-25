
Build process is not finalized yet, but you can run the full app with extension support enabled.

## Recommended: NVM

Install [nvm](https://github.com/creationix/nvm#install-script).

Install npm and node.

    nvm install v16
    nvm use v16

# Setup

Install yarn.

```
npm install -g yarn
```

## Gather dependencies / Initialize

```
cd CodeRibbon-Theia
yarn
```

## Running the browser example

```
# no extension support:
yarn start:browser
# with OpenVSX extensions:
yarn start:browser-ext
```

Open http://localhost:3000 in the browser.

## Running the Electron example

```
# no extension support:
yarn start:electron
# with OpenVSX extensions:
yarn start:electron-ext
```
