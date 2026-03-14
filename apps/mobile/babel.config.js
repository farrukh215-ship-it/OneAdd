module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', './babel.nativewind-preset'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
