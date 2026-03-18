const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, '../..')];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  react: path.resolve(__dirname, '../../node_modules/react'),
  'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
  'react-native': path.resolve(__dirname, '../../node_modules/react-native'),
};

module.exports = withNativeWind(config, {
  input: './global.css',
});
