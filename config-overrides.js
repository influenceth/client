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

const addDataUriFileLoader = () => config => {
  const loaders = config.module.rules.find(rule => Array.isArray(rule.oneOf)).oneOf;
  loaders.unshift({
    test: /\.datauri$/,
    exclude: /node_modules/,
    use: [
      'raw-loader',
    ]
  });

  return config;
};

const addSVGR = () => config => {
  const loaders = config.module.rules.find(rule => Array.isArray(rule.oneOf)).oneOf;
  loaders.unshift({
    test: /\.svg$/,
    exclude: /node_modules/,
    use: [{
      loader: '@svgr/webpack',
      options: {
        svgoConfig: {
          plugins: {
            removeViewBox: false
          }
        }
      }
    }]
  });

  return config;
}

module.exports = override(
  addBabelPlugin([
    'babel-plugin-root-import',
    {
      'rootPathPrefix': '~',
      'rootPathSuffix': 'src'
    }
  ]),
  addGlslifyLoader(),
  addDataUriFileLoader(),
  addSVGR()
);
