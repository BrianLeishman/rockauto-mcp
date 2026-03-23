import { createMcpHandler } from "agents/mcp";
import { createServer } from "./server.js";

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    // New server instance per request (required for stateless mode)
    const server = createServer();
    return createMcpHandler(server)(request, env, ctx);
  },
};
