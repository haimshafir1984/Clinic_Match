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
      PUPPETEER_LAUNCH_OPTIONS: JSON.stringify(DEFAULT_LAUNCH_OPTIONS),
    },
  });

  await client.connect(transport);

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

async function scrapeJobsWithPuppeteer({ url, extractorScript, launchOptions = DEFAULT_LAUNCH_OPTIONS }) {
  return withPuppeteerClient(async (client) => {
    await withTimeout(
      client.callTool({
        name: "puppeteer_navigate",
        arguments: { url, launchOptions },
      }),
      "puppeteer_navigate"
    );

    const result = await withTimeout(
      client.callTool({
        name: "puppeteer_evaluate",
        arguments: { script: extractorScript },
      }),
      "puppeteer_evaluate"
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
  DEFAULT_LAUNCH_OPTIONS,
  scrapeJobsWithPuppeteer,
  withPuppeteerClient,
};
