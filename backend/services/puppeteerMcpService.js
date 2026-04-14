const path = require("path");
const { Client } = require("@modelcontextprotocol/sdk/client");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

const DEFAULT_PUPPETEER_COMMAND = process.env.PUPPETEER_MCP_COMMAND || "npx";
const DEFAULT_PUPPETEER_ARGS = process.env.PUPPETEER_MCP_ARGS
  ? process.env.PUPPETEER_MCP_ARGS.split(" ").filter(Boolean)
  : ["-y", "@modelcontextprotocol/server-puppeteer"];
const DEFAULT_LAUNCH_OPTIONS = process.env.PUPPETEER_LAUNCH_OPTIONS
  ? safeParseJson(process.env.PUPPETEER_LAUNCH_OPTIONS, { headless: true })
  : { headless: true };
const DEFAULT_TOOL_TIMEOUT_MS = Number.parseInt(process.env.PUPPETEER_MCP_TOOL_TIMEOUT_MS || "45000", 10);
const DEFAULT_CONNECT_TIMEOUT_MS = Number.parseInt(process.env.PUPPETEER_MCP_CONNECT_TIMEOUT_MS || "12000", 10);
const DEFAULT_CACHE_DIR =
  process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, "..", ".cache", "puppeteer");

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function getTextFromToolResult(result) {
  const textParts = Array.isArray(result?.content)
    ? result.content
        .filter((item) => item && item.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
    : [];

  if (textParts.length > 0) {
    return textParts.join("\n").trim();
  }

  if (typeof result?.structuredContent === "string") {
    return result.structuredContent;
  }

  return "";
}

async function withPuppeteerClient(work) {
  const client = new Client(
    { name: "clinic-match-market-jobs", version: "1.0.0" },
    { capabilities: {} }
  );

  const transport = new StdioClientTransport({
    command: DEFAULT_PUPPETEER_COMMAND,
    args: DEFAULT_PUPPETEER_ARGS,
    cwd: process.cwd(),
    stderr: process.env.NODE_ENV === "development" ? "inherit" : "pipe",
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: DEFAULT_CACHE_DIR,
      PUPPETEER_LAUNCH_OPTIONS: JSON.stringify(DEFAULT_LAUNCH_OPTIONS),
    },
  });

  try {
    await withTimeout(client.connect(transport), "puppeteer_connect", DEFAULT_CONNECT_TIMEOUT_MS);
  } catch (error) {
    await transport.close().catch(() => {});
    throw error;
  }

  try {
    return await work(client);
  } finally {
    await transport.close().catch(() => {});
  }
}

function withTimeout(promise, label, timeoutMs = DEFAULT_TOOL_TIMEOUT_MS) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms. Check Puppeteer MCP launch options or Chrome availability.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function scrapeJobsWithPuppeteer({
  url,
  extractorScript,
  launchOptions = DEFAULT_LAUNCH_OPTIONS,
  sourceName = "puppeteer",
  forceEnable = false,
  timeoutMs = DEFAULT_TOOL_TIMEOUT_MS,
}) {
  if (!forceEnable && !process.env.ENABLE_PUPPETEER_SCRAPING) {
    throw new Error(`Puppeteer scraping disabled (set ENABLE_PUPPETEER_SCRAPING=true to enable) [source: ${sourceName}]`);
  }

  return withPuppeteerClient(async (client) => {
    await withTimeout(
      client.callTool({
        name: "puppeteer_navigate",
        arguments: { url, launchOptions },
      }),
      "puppeteer_navigate",
      timeoutMs
    );

    const result = await withTimeout(
      client.callTool({
        name: "puppeteer_evaluate",
        arguments: { script: extractorScript },
      }),
      "puppeteer_evaluate",
      timeoutMs
    );

    const text = getTextFromToolResult(result);
    if (!text) {
      return [];
    }

    const parsed = safeParseJson(text, []);
    return Array.isArray(parsed) ? parsed : [];
  });
}

module.exports = {
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_LAUNCH_OPTIONS,
  scrapeJobsWithPuppeteer,
  withPuppeteerClient,
};
