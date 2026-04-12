const { withPuppeteerClient } = require("../services/puppeteerMcpService");

(async () => {
  const tools = await withPuppeteerClient(async (client) => {
    const result = await client.listTools();
    return result.tools.map((tool) => tool.name);
  });

  console.log("Available Puppeteer MCP tools:");
  for (const tool of tools) {
    console.log(`- ${tool}`);
  }
})().catch((error) => {
  console.error("Puppeteer MCP test failed:", error);
  process.exit(1);
});
