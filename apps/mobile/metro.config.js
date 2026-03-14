const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const nativewindBabelPath = require.resolve('nativewind/babel');
const nativewindDir = path.dirname(nativewindBabelPath);
const mobileNodeModules = path.resolve(__dirname, 'node_modules');
const workspaceRoot = path.resolve(__dirname, '../..');
const workspaceNodeModules = path.join(workspaceRoot, 'node_modules');

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.join(mobileNodeModules, 'react'),
  'react-native': path.join(mobileNodeModules, 'react-native'),
  'react-native-css-interop': path.resolve(nativewindDir, '../react-native-css-interop'),
};
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));
config.resolver.nodeModulesPaths = Array.from(
  new Set([...(config.resolver.nodeModulesPaths || []), mobileNodeModules, workspaceNodeModules]),
);
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
