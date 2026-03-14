const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(projectRoot);
const nativewindBabelPath = require.resolve('nativewind/babel');
const nativewindDir = path.dirname(nativewindBabelPath);
const cssInteropPath = path.resolve(nativewindDir, '../react-native-css-interop');
const resolveFromProject = (moduleName) =>
  path.dirname(require.resolve(`${moduleName}/package.json`, { paths: [projectRoot] }));

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: resolveFromProject('react'),
  'react-dom': resolveFromProject('react-dom'),
  'react-native': resolveFromProject('react-native'),
  'react-native-css-interop': cssInteropPath,
};

module.exports = config;
