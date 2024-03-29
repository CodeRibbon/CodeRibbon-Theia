/**
 * This file can be edited to customize webpack configuration.
 * To reset delete this file and rerun theia build again.
 */
// @ts-check
const config = require('./gen-webpack.config.js');

/**
 * Expose bundled modules on window.theia.moduleName namespace, e.g.
 * window['theia']['@theia/core/lib/common/uri'].
 * Such syntax can be used by external code, for instance, for testing.
config[0].module.rules.push({
    test: /\.js$/,
    loader: require.resolve('@theia/application-manager/lib/expose-loader')
}); */

config[0].module.rules.push({
  test: /\.less/,
  use: [
    'style-loader',
    'css-loader',
    'less-loader'
  ]
})

module.exports = config;
