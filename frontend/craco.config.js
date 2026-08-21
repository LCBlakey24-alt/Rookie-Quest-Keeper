// craco.config.js
const path = require("path");
const fs = require("fs");

// Detect if we're in a CI/production build environment
const isCI = process.env.CI === "true" || process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

// Safely load dotenv if .env file exists
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config();
}

// Environment variable overrides
// Disable plugins in CI/production to avoid build issues
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === "true" || isCI,
  enableVisualEdits: process.env.REACT_APP_ENABLE_VISUAL_EDITS === "true" && !isCI,
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true" && !isCI,
};

// Conditionally load visual editing modules only if enabled
let babelMetadataPlugin;
let setupDevServer;

if (config.enableVisualEdits) {
  try {
    babelMetadataPlugin = require("./plugins/visual-edits/babel-metadata-plugin");
    setupDevServer = require("./plugins/visual-edits/dev-server-setup");
  } catch (err) {
    console.warn("Warning: Could not load visual-edits plugins:", err.message);
    config.enableVisualEdits = false;
  }
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  try {
    WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
    setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
    healthPluginInstance = new WebpackHealthPlugin();
  } catch (err) {
    console.warn("Warning: Could not load health-check plugins:", err.message);
    config.enableHealthCheck = false;
  }
}

const webpackConfig = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });

        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      return webpackConfig;
    },
  },
  // CRA/Jest does not inherit webpack aliases. Keep the same @ -> src contract
  // in tests so test imports exercise the same modules as production builds.
  jest: {
    configure: (jestConfig) => ({
      ...jestConfig,
      moduleNameMapper: {
        ...(jestConfig.moduleNameMapper || {}),
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    }),
  },
};

// Only add babel plugin if visual editing is enabled
if (config.enableVisualEdits) {
  webpackConfig.babel = {
    plugins: [babelMetadataPlugin],
  };
}

// Setup dev server with visual edits and/or health check
if (config.enableVisualEdits || config.enableHealthCheck) {
  webpackConfig.devServer = (devServerConfig) => {
    // Apply visual edits dev server setup if enabled
    if (config.enableVisualEdits && setupDevServer) {
      devServerConfig = setupDevServer(devServerConfig);
    }

    // Apply health check endpoints if enabled
    if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
      const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

      devServerConfig.setupMiddlewares = (middlewares, devServer) => {
        // Call original setup if exists
        if (originalSetupMiddlewares) {
          middlewares = originalSetupMiddlewares(middlewares, devServer);
        }

        // Setup health check endpoints
        setupHealthEndpoints(devServer, healthPluginInstance);

        return middlewares;
      };
    }

    return devServerConfig;
  };
}

module.exports = webpackConfig;
