'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const ChromeWatchReload = require('./chrome-watch-reload');

const targetBrowser = process.env.TARGET_BROWSER || 'chrome';

// Merge webpack configuration files
module.exports = (_env, argv) => merge(common, {
  entry: {
    popup: PATHS.src + '/popup.js',
    background: PATHS.src + '/background.ts',
  },
  output: {
    path: path.resolve(__dirname, `../build/${targetBrowser}`),
    filename: '[name].js',
  },
  plugins: [
    ...(targetBrowser === 'chrome' && argv.watch && argv.mode === 'development'
      ? [new ChromeWatchReload()]
      : []),
    new webpack.DefinePlugin({
      'process.env.TARGET_BROWSER': JSON.stringify(targetBrowser),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, `../public-flavors/${targetBrowser}`),
          to: path.resolve(__dirname, `../build/${targetBrowser}`),
        }
      ]
    }),
  ],
});
