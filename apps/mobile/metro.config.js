const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const nativewindBabelPath = require.resolve('nativewind/babel');
const nativewindDir = path.dirname(nativewindBabelPath);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-css-interop': path.resolve(nativewindDir, '../react-native-css-interop'),
};

module.exports = config;
