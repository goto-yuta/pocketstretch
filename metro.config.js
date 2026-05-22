const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force react-native condition so zustand uses CJS (middleware.js) instead of ESM (middleware.mjs)
// The ESM version contains import.meta.env which is invalid outside ES modules
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['react-native', 'require', 'default'];

module.exports = config;
