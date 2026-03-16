const path = require('path');

module.exports = function (api) {
  api.cache(true);

  const mobileRoot = path.resolve(__dirname, 'apps/mobile');

  return {
    presets: [require.resolve('babel-preset-expo', { paths: [mobileRoot] }), './apps/mobile/babel.nativewind-preset'],
    plugins: [require.resolve('react-native-reanimated/plugin', { paths: [mobileRoot] })],
  };
};
