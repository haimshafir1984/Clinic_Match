// Generic HTML -> PNG renderer, used for both the OG card and the story/status
// card. Usage: node scripts/render-html-to-png.cjs <input.html> <output.png> <width> <height>
//
// Uses the puppeteer install that already lives in ../backend so nothing here
// needs its own headless-browser dependency.

const path = require("path");
const fs = require("fs");

const [, , inputArg, outputArg, widthArg, heightArg] = process.argv;

if (!inputArg || !outputArg) {
  console.error("Usage: node render-html-to-png.cjs <input.html> <output.png> [width] [height]");
  process.exit(1);
}

const INPUT = path.resolve(inputArg);
const OUTPUT = path.resolve(outputArg);
const WIDTH = Number.parseInt(widthArg || "1200", 10);
const HEIGHT = Number.parseInt(heightArg || "630", 10);

(async () => {
  let puppeteer;
  try {
    puppeteer = require(path.join(__dirname, "..", "..", "backend", "node_modules", "puppeteer"));
  } catch {
    console.error("Could not load puppeteer from ../backend/node_modules. Run `npm install` in backend/ first.");
    process.exit(1);
  }

  if (!fs.existsSync(INPUT)) {
    console.error(`Missing input file: ${INPUT}`);
    process.exit(1);
  }

  // Puppeteer wants one exact Chrome build; the copies actually present on a
  // given machine rarely match. Scan the known cache roots and use whichever
  // real binary turns up, newest first, then fall through if it can't spawn.
  const chromeRoots = [
    path.join(__dirname, "..", "..", "backend", ".cache", "puppeteer", "chrome"),
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".cache", "puppeteer", "chrome"),
  ];

  const candidates = [];
  for (const root of chromeRoots) {
    if (!fs.existsSync(root)) continue;
    const builds = fs
      .readdirSync(root)
      .filter((entry) => {
        try { return fs.statSync(path.join(root, entry)).isDirectory(); } catch { return false; }
      })
      .sort()
      .reverse();
    for (const build of builds) {
      for (const rel of [
        ["chrome-win64", "chrome.exe"],
        ["chrome-linux64", "chrome"],
        ["chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
      ]) {
        const candidate = path.join(root, build, ...rel);
        if (fs.existsSync(candidate)) candidates.push(candidate);
      }
    }
  }
  candidates.push(null); // last resort: puppeteer's own default lookup

  let browser;
  const failures = [];
  for (const executablePath of candidates) {
    try {
      browser = await puppeteer.launch({
        headless: "new",
        ...(executablePath ? { executablePath } : {}),
      });
      console.log(`Using Chrome: ${executablePath || "(puppeteer default)"}`);
      break;
    } catch (err) {
      failures.push(`${executablePath || "(default)"}: ${err.message.split("\n")[0]}`);
    }
  }

  if (!browser) {
    console.error("No usable Chrome found. Tried:\n  " + failures.join("\n  "));
    process.exit(1);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await page.goto(`file://${INPUT.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: OUTPUT, type: "png" });
    console.log(`Wrote ${OUTPUT}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
