# RockAuto MCP Server

An MCP (Model Context Protocol) server that lets AI assistants search the [RockAuto](https://www.rockauto.com) auto parts catalog. Browse vehicles, look up parts by category, search by part number, and get pricing and details — all through natural conversation.

## Quick Start

A hosted instance is available — no install required:

```
https://rockauto-mcp.b-a92.workers.dev/sse
```

### ChatGPT

1. Open [ChatGPT](https://chatgpt.com) and go to **Settings** > **Connected apps** ([docs](https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta))
2. Click **Add connection** and select **MCP**
3. Paste the URL: `https://rockauto-mcp.b-a92.workers.dev/sse`
4. Save

### Claude Code

Run this in your terminal:

```bash
claude mcp add rockauto --transport sse https://rockauto-mcp.b-a92.workers.dev/sse
```

See the [Claude Code MCP docs](https://code.claude.com/docs/en/mcp.md) for more options.

### Claude Desktop

Add to your `claude_desktop_config.json` ([docs](https://modelcontextprotocol.io/quickstart/user)):

```json
{
  "mcpServers": {
    "rockauto": {
      "url": "https://rockauto-mcp.b-a92.workers.dev/sse"
    }
  }
}
```

### Other MCP Clients

Any MCP client that supports SSE transport can connect to the URL above.

## Example Prompts

Once connected, try asking your AI assistant:

- "What brake pads are available for a 2020 Honda Civic?"
- "Search for part number 15400-PLM-A02"
- "Show me oil filters for a 2018 Toyota Camry 2.5L"
- "Compare prices for alternators for a 2015 Ford F-150"

## Tools

| Tool | Description |
| ---- | ----------- |
| `list_makes` | List all vehicle manufacturers |
| `list_years` | List available years for a make |
| `list_models` | List models for a make + year |
| `list_engines` | List engine options for a vehicle |
| `list_categories` | List part categories for a vehicle + engine |
| `browse_category` | Browse subcategories or parts at a catalog URL |
| `get_parts` | Get parts listed on a catalog page |
| `search_part_number` | Search by part number (supports `*` wildcards) |
| `get_part_details` | Get detailed specs for a specific part |

## Self-Hosting

### Local (stdio)

```bash
git clone https://github.com/BrianLeishman/rockauto-mcp.git
cd rockauto-mcp
npm install
npm run build
node build/index.js
```

For Claude Code (local stdio):

```bash
claude mcp add rockauto -- node /absolute/path/to/rockauto-mcp/build/index.js
```

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

This gives you your own SSE endpoint at `https://rockauto-mcp.<your-subdomain>.workers.dev/sse`.

### Local Development

```bash
npm run start     # Run Cloudflare Worker locally with wrangler
npm run dev       # Watch mode for TypeScript compilation
```

## How It Works

The server scrapes RockAuto's public catalog pages and parses the HTML to extract vehicle and part data. No API key is needed.

## License

MIT
