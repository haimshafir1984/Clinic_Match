const { join } = require("path");

/**
 * Keep the browser cache inside the backend project so Render reuses
 * the installed browser between build and runtime for this service.
 *
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
  chrome: {
    skipDownload: false,
  },
};
