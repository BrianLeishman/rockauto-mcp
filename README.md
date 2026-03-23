# RockAuto MCP Server

An MCP (Model Context Protocol) server that lets AI assistants search the [RockAuto](https://www.rockauto.com) auto parts catalog. Browse vehicles, look up parts by category, search by part number, and get pricing and details — all through natural conversation.

## Features

- **Vehicle lookup** — Browse makes, years, models, and engine options
- **Part catalog navigation** — Drill into categories and subcategories
- **Part search** — Search by part number (supports wildcards)
- **Part details** — Get specs, pricing, and manufacturer info

### Tools

| Tool | Description |
|------|-------------|
| `list_makes` | List all vehicle manufacturers |
| `list_years` | List available years for a make |
| `list_models` | List models for a make + year |
| `list_engines` | List engine options for a vehicle |
| `list_categories` | List part categories for a vehicle + engine |
| `browse_category` | Browse subcategories or parts at a catalog URL |
| `get_parts` | Get parts listed on a catalog page |
| `search_part_number` | Search by part number (supports `*` wildcards) |
| `get_part_details` | Get detailed specs for a specific part |

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/BrianLeishman/rockauto-mcp.git
cd rockauto-mcp
npm install
npm run build
```

## Usage

### Claude Desktop / Claude Code

Add to your Claude config (`~/.claude/settings.json` for Claude Code, or `claude_desktop_config.json` for Claude Desktop):

```json
{
  "mcpServers": {
    "rockauto": {
      "command": "node",
      "args": ["/absolute/path/to/rockauto-mcp/build/index.js"]
    }
  }
}
```

Then ask Claude things like:
- "What brake pads are available for a 2020 Honda Civic?"
- "Search for part number 15400-PLM-A02"
- "Show me oil filters for a 2018 Toyota Camry 2.5L"

### ChatGPT (via Remote MCP)

This server can be deployed as a Cloudflare Worker for remote MCP access, which ChatGPT supports.

#### Deploy to Cloudflare Workers

```bash
npm run deploy
```

This deploys the server as a Cloudflare Worker. After deploying, you'll get a URL like `https://rockauto-mcp.<your-subdomain>.workers.dev`.

#### Connect to ChatGPT

1. Go to [ChatGPT Settings](https://chatgpt.com/#settings/connected-apps)
2. Under **Connected apps**, click **Add connection**
3. Select **MCP** as the connection type
4. Enter your Worker URL (e.g. `https://rockauto-mcp.<your-subdomain>.workers.dev/sse`)
5. Save

Then ask ChatGPT to look up parts the same way you would with Claude.

### Other MCP Clients

#### stdio (local)

Run directly for any MCP client that supports stdio transport:

```bash
node build/index.js
```

#### Remote / SSE

For remote MCP clients, deploy to Cloudflare Workers (`npm run deploy`) and connect via the `/sse` endpoint.

### Local Development

```bash
npm run start     # Run Cloudflare Worker locally with wrangler
npm run dev       # Watch mode for TypeScript compilation
```

## How It Works

The server scrapes RockAuto's catalog pages and parses the HTML to extract vehicle and part data. It maintains cookies/session state to navigate the catalog the same way a browser would.

No API key is needed — it works by parsing RockAuto's public catalog pages.

## License

MIT
