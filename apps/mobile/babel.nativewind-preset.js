module.exports = function () {
  const preset = require('nativewind/babel')();

  return {
    ...preset,
    plugins: (preset.plugins || []).filter((plugin) => {
      if (typeof plugin === 'string') {
        return plugin !== 'react-native-worklets/plugin';
      }

      if (Array.isArray(plugin)) {
        return plugin[0] !== 'react-native-worklets/plugin';
      }

      return true;
    }),
  };
};
