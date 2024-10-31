'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

const targetBrowser = process.env.TARGET_BROWSER || 'chrome';

// Merge webpack configuration files
const config = merge(common, {
  entry: {
    popup: PATHS.src + '/popup.js',
    background: PATHS.src + '/background.ts',
  },
  output: {
    path: path.resolve(__dirname, `../build/${targetBrowser}`),
    filename: '[name].js',
  },
  plugins: [
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

module.exports = config;