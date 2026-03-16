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
  'react/jsx-runtime': path.join(mobileNodeModules, 'react/jsx-runtime'),
  'react/jsx-dev-runtime': path.join(mobileNodeModules, 'react/jsx-dev-runtime'),
  'react-native': path.join(mobileNodeModules, 'react-native'),
  'react-dom': path.join(mobileNodeModules, 'react-dom'),
  'react-native-css-interop': path.resolve(nativewindDir, '../react-native-css-interop'),
};
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));
config.resolver.nodeModulesPaths = Array.from(
  new Set([...(config.resolver.nodeModulesPaths || []), mobileNodeModules, workspaceNodeModules]),
);
// Force Metro to resolve packages only from explicit node_modules roots.
// This avoids pulling a second React copy from other workspaces in the monorepo.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
