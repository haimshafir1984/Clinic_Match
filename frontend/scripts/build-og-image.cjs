// Renders scripts/og-card.html to public/og-image.png at 1200x630.
// Run with: node scripts/build-og-image.js  (from the frontend/ directory)
//
// Uses the puppeteer install that already lives in ../backend so the frontend
// doesn't need a headless-browser dependency just to regenerate one static
// asset. Re-run this only when the card design or copy changes.

const path = require("path");
const fs = require("fs");

const CARD = path.join(__dirname, "og-card.html");
const OUT = path.join(__dirname, "..", "public", "og-image.png");

(async () => {
  let puppeteer;
  try {
    puppeteer = require(path.join(__dirname, "..", "..", "backend", "node_modules", "puppeteer"));
  } catch {
    console.error(
      "Could not load puppeteer from ../backend/node_modules.\n" +
        "Run `npm install` in backend/ first, or regenerate the image elsewhere."
    );
    process.exit(1);
  }

  if (!fs.existsSync(CARD)) {
    console.error(`Missing card template: ${CARD}`);
    process.exit(1);
  }

  // Puppeteer looks for one exact Chrome build; the copies actually present
  // on a given machine rarely match. Scan the known cache roots (the backend's
  // pinned dir per backend/.puppeteerrc.cjs, then the default user cache) and
  // use whichever real binary turns up, newest first.
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
  // A present binary is not necessarily a runnable one — stale/partial
  // downloads fail with spawn UNKNOWN — so fall through to the next.
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
    // Exactly the 1200x630 OG spec at 1x. A 2x render looks crisper but lands
    // around 270 KB, which is close enough to WhatsApp's practical preview
    // ceiling to risk the thumbnail silently not rendering — and WhatsApp is
    // the main sharing channel here.
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.goto(`file://${CARD.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
    // Webfonts load over the network; without this the shot can capture the
    // fallback face.
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: OUT, type: "png" });
    console.log(`Wrote ${OUT}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("OG image build failed:", err);
  process.exit(1);
});
