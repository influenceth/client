const { addBabelPlugin, override, tap } = require('customize-cra');

// Custom loader for GLSL shaders
const addGlslifyLoader = () => config => {
  const loaders = config.module.rules.find(rule => Array.isArray(rule.oneOf)).oneOf;
  loaders.unshift({
    test: /\.(glsl|frag|vert)$/,
    exclude: /node_modules/,
    use: [
      'raw-loader',
      'glslify-loader'
    ]
  });

  return config;
};

module.exports = override(
  addBabelPlugin([
    'babel-plugin-root-import',
    {
      'rootPathPrefix': '~',
      'rootPathSuffix': 'src'
    }
  ]),
  addGlslifyLoader()
);
