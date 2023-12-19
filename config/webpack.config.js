'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = merge(common, {
  entry: {
    popup: PATHS.src + '/popup.js',
    // contentScript: PATHS.src + '/contentScript.js',
    background: PATHS.src + '/background.ts',
    // storageHelper: PATHS.src + '/storage-helper.js',
  },
  // plugins: [
  //   {
  //     apply(compiler) {
  //       compiler.hooks.assetEmitted.tap(
  //         'MyPlugin',
  //         (file, { content, source, outputPath, compilation, targetPath }) => {
  //           // console.log(content); // <Buffer 66 6f 6f 62 61 72>
  //         }
  //       );
  //     }
  //   }
  // ],
});

module.exports = config;