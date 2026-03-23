import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RockAutoClient } from "./client.js";

export function createServer(): McpServer {
  const client = new RockAutoClient();

  const server = new McpServer({
    name: "rockauto",
    version: "1.0.0",
  });

  server.registerTool(
    "list_makes",
    {
      title: "List Vehicle Makes",
      description:
        "List all vehicle makes (manufacturers) available on RockAuto. Returns make names that can be used with list_years.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const makes = await client.getMakes();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(makes.map((m) => m.name), null, 2),
            },
          ],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_years",
    {
      title: "List Years for Make",
      description:
        "List all available model years for a vehicle make. Use a make name from list_makes.",
      inputSchema: {
        make: z.string().describe('Vehicle make, e.g. "Honda", "Toyota", "Ford"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ make }) => {
      try {
        const years = await client.getYears(make);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(years.map((y) => y.year), null, 2),
            },
          ],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_models",
    {
      title: "List Models",
      description:
        "List all models for a given make and year. Use results from list_makes and list_years.",
      inputSchema: {
        make: z.string().describe('Vehicle make, e.g. "Honda"'),
        year: z.string().describe('Model year, e.g. "2020"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ make, year }) => {
      try {
        const models = await client.getModels(make, year);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(models.map((m) => m.name), null, 2),
            },
          ],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_engines",
    {
      title: "List Engines",
      description:
        "List engine options for a specific vehicle. Returns engine descriptions and their carcode IDs needed for browsing parts.",
      inputSchema: {
        make: z.string().describe('Vehicle make, e.g. "Honda"'),
        year: z.string().describe('Model year, e.g. "2020"'),
        model: z.string().describe('Vehicle model, e.g. "Civic"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ make, year, model }) => {
      try {
        const engines = await client.getEngines(make, year, model);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                engines.map((e) => ({
                  description: e.description,
                  carcode: e.carcode,
                })),
                null,
                2
              ),
            },
          ],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_categories",
    {
      title: "List Part Categories",
      description:
        "List part categories for a specific vehicle. Requires the engine description and carcode from list_engines.",
      inputSchema: {
        make: z.string().describe('Vehicle make, e.g. "Honda"'),
        year: z.string().describe('Model year, e.g. "2020"'),
        model: z.string().describe('Vehicle model, e.g. "Civic"'),
        engine: z
          .string()
          .describe('Engine description from list_engines, e.g. "2.0L L4"'),
        carcode: z
          .string()
          .describe("Carcode from list_engines, e.g. \"3445241\""),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ make, year, model, engine, carcode }) => {
      try {
        const categories = await client.getCategories(
          make,
          year,
          model,
          engine,
          carcode
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                categories.map((c) => ({ name: c.name, url: c.url })),
                null,
                2
              ),
            },
          ],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "browse_category",
    {
      title: "Browse Category or Subcategory",
      description:
        "Browse a RockAuto catalog URL to see subcategories or parts. Use URLs returned by list_categories or previous browse_category calls. Returns navigation links (subcategories/part types) and any parts found at that level.",
      inputSchema: {
        url: z
          .string()
          .url()
          .describe("A RockAuto catalog URL from a previous tool result"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ url }) => {
      try {
        const result = await client.browseByUrl(url);
        const output: Record<string, unknown> = {};

        if (result.navigation.length > 0) {
          output.subcategories = result.navigation.map((n) => ({
            name: n.name,
            url: n.url,
          }));
        }

        if (result.parts.length > 0) {
          output.parts = result.parts;
        }

        if (result.navigation.length === 0 && result.parts.length === 0) {
          output.message =
            "No subcategories or parts found at this URL. The page may load content dynamically via AJAX. Try drilling deeper through the catalog hierarchy.";
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_parts",
    {
      title: "Get Parts",
      description:
        "Get parts listed on a RockAuto catalog page. Provide the URL of a part type page (the deepest level in the catalog hierarchy). Returns manufacturer, part number, price, and description for each part.",
      inputSchema: {
        url: z
          .string()
          .url()
          .describe(
            "URL of a RockAuto part type page from browse_category results"
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ url }) => {
      try {
        const parts = await client.getParts(url);
        if (parts.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No parts found on this page. Parts may be loaded dynamically. Try using browse_category on the URL first to find the correct part type URL.",
              },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(parts, null, 2) }],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "search_part_number",
    {
      title: "Search by Part Number",
      description:
        'Search RockAuto by a specific part number. Supports wildcards (*). Example: "GNAD2102C" or "15400-PLM-A02".',
      inputSchema: {
        partNumber: z
          .string()
          .describe('Part number to search for, e.g. "GNAD2102C". Supports * wildcards.'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ partNumber }) => {
      try {
        const results = await client.searchByPartNumber(partNumber);
        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No results found for part number "${partNumber}".`,
              },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "search_parts",
    {
      title: "Search Parts by Vehicle and Type",
      description:
        'Search for parts by vehicle and part type in one step. Automatically navigates the catalog hierarchy to find matching parts. Use simple part type keywords like "brake pad", "oil filter", "alternator", "spark plug", etc. Returns parts with direct RockAuto catalog links.',
      inputSchema: {
        make: z.string().describe('Vehicle make, e.g. "Honda", "Toyota", "Ford"'),
        year: z.string().describe('Model year, e.g. "2020"'),
        model: z.string().describe('Vehicle model, e.g. "Civic", "Camry", "F-150"'),
        partType: z
          .string()
          .describe(
            'Part type to search for, e.g. "brake pad", "oil filter", "alternator", "spark plug", "strut"'
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ make, year, model, partType }) => {
      try {
        const result = await client.searchParts(make, year, model, partType);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  catalogUrl: result.catalogUrl,
                  parts: result.parts,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_part_details",
    {
      title: "Get Part Details",
      description:
        "Get detailed information about a specific part using its more-info URL from a previous search or parts listing.",
      inputSchema: {
        url: z
          .string()
          .url()
          .describe(
            "The moreInfoUrl from a parts listing or search result"
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ url }) => {
      try {
        const details = await client.getPartDetails(url);
        if (Object.keys(details).length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No details found. The page may load content dynamically.",
              },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(details, null, 2) }],
        };
      } catch (e: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}
