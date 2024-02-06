require('dotenv').config({ silent: true });
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './server.js',
  mode: 'production',
  node: {
    __dirname: false
  },
  optimization: {
    minimizer: [new TerserPlugin({ extractComments: false })],
    nodeEnv: process.env.NODE_ENV || false
  },
  output: {
    filename: 'server.built.js',
    path: __dirname,
  },
  target: 'node'
};
