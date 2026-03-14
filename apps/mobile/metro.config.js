const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const nativewindBabelPath = require.resolve('nativewind/babel');
const nativewindDir = path.dirname(nativewindBabelPath);
const mobileNodeModules = path.resolve(__dirname, 'node_modules');

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.join(mobileNodeModules, 'react'),
  'react-native': path.join(mobileNodeModules, 'react-native'),
  'react-native-css-interop': path.resolve(nativewindDir, '../react-native-css-interop'),
};
config.resolver.nodeModulesPaths = [mobileNodeModules];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
