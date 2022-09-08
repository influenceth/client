const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './server.js',
  mode: process.env.NODE_ENV,
  node: {
    __dirname: false
  },
  optimization: {
    minimizer: [new TerserPlugin({ extractComments: false })]
  },
  output: {
    filename: 'server.built.js',
    path: __dirname,
  },
  target: 'node'
};
