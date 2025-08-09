const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve = config.resolve || {};
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    crypto: require.resolve('crypto-browserify'),
    assert: require.resolve('assert/'),
    path: require.resolve('path-browserify'),
    stream: require.resolve('stream-browserify')
  };
  return config;
};
