const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force CJS builds for packages that have import.meta in their ESM builds.
// Metro resolves the 'import' condition for web and picks up .mjs files,
// but the resulting bundle is not served as an ES module, causing
// "Cannot use 'import.meta' outside a module" errors in the browser.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
