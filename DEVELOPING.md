## Getting started

Install [nvm](https://github.com/creationix/nvm#install-script).

Install npm and node.

    nvm install v18
    nvm use v18

Install yarn.

    npm install -g yarn

## Gather dependencies / Initialize

    cd CodeRibbon-Theia
    yarn

## Running the browser example

    yarn browser build
    yarn browser start

Open http://localhost:3000 in the browser.

## Running the Electron example

    yarn electron build
    yarn electron start

## Developing with the browser example

Start watching all packages, including `browser-app`, of your application with

    yarn watch

*or* watch only specific packages with

    cd coderibbon-theia
    yarn watch

Run the example as [described above](#Running-the-browser-example)
## Developing with the Electron example

Start watching all packages, including `electron-app`, of your application with

    yarn watch

*or* watch only specific packages with

    cd coderibbon-theia
    yarn watch

Run the example as [described above](#Running-the-Electron-example)

## Publishing CodeRibbon-Theia

Create a npm user and login to the npm registry, [more on npm publishing](https://docs.npmjs.com/getting-started/publishing-npm-packages).

    npm login

Publish packages with lerna to update versions properly across local packages, [more on publishing with lerna](https://github.com/lerna/lerna#publish).

    npx lerna publish
