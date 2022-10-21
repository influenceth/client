const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './server.js',
  mode: 'production',
  node: {
    __dirname: false
  },
  optimization: {
    minimizer: [new TerserPlugin({ extractComments: false })],
    nodeEnv: false
  },
  output: {
    filename: 'server.built.js',
    hashFunction: 'xxhash64',
    path: __dirname,
  },
  target: 'node'
};
