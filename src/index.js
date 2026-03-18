#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

let baseUrl = null;

const notConnectedError = "Not connected. Call connect(port) first to specify which process-compose instance to use.";

const toolSchemas = {
  connect: z.object({
    port: z.number().int().positive()
  }),
  isAlive: z.object({}),
  getProcesses: z.object({}),
  stopProcesses: z.object({
    names: z.array(z.string()).min(1)
  }),
  getDependencyGraph: z.object({}),
  getProjectName: z.object({}),
  getProjectState: z.object({}),
  getProcess: z.object({
    name: z.string().min(1)
  }),
  getProcessPorts: z.object({
    name: z.string().min(1)
  }),
  getProcessInfo: z.object({
    name: z.string().min(1)
  }),
  stopProcess: z.object({
    name: z.string().min(1)
  }),
  startProcess: z.object({
    name: z.string().min(1)
  }),
  restartProcess: z.object({
    name: z.string().min(1)
  }),
  getProcessLogs: z.object({
    name: z.string().min(1),
    endOffset: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative()
  })
};

const tools = [
  {
    name: "connect",
    description: "Connect to a process-compose instance. Must be called before any other tool.",
    inputSchema: {
      type: "object",
      properties: {
        port: { type: "integer", description: "Port number of the process-compose API server" }
      },
      required: ["port"],
      additionalProperties: false
    }
  },
  {
    name: "isAlive",
    description: "Check if the process-compose server is responding. Requires connect() first.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "getProcesses",
    description: "Get all configured processes and their status. Requires connect() first.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "stopProcesses",
    description: "Stop multiple processes by name. Requires connect() first.",
    inputSchema: {
      type: "object",
      properties: {
        names: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["names"],
      additionalProperties: false
    }
  },
  {
    name: "getDependencyGraph",
    description: "Get the process dependency graph with current status. Requires connect() first.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "getProjectName",
    description: "Get the current project name. Requires connect() first.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "getProjectState",
    description: "Get the current project state. Requires connect() first.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "getProcess",
    description: "Get a single process state. Requires connect() first.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }
      },
      required: ["name"],
      additionalProperties: false
    }
  },
  {
    name: "getProcessPorts",
    description: "Get open TCP/UDP ports for a process. Requires connect() first.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }
      },
      required: ["name"],
      additionalProperties: false
    }
  },
  {
    name: "getProcessInfo",
    description: "Get a process configuration. Requires connect() first.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }
      },
      required: ["name"],
      additionalProperties: false
    }
  },
  {
    name: "stopProcess",
    description: "Stop a single process by name. Requires connect() first.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }
      },
      required: ["name"],
      additionalProperties: false
    }
  },
  {
    name: "startProcess",
    description: "Start a single process by name. Requires connect() first.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }
      },
      required: ["name"],
      additionalProperties: false
    }
  },
  {
    name: "restartProcess",
    description: "Restart a single process by name. Requires connect() first.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }
      },
      required: ["name"],
      additionalProperties: false
    }
  },
  {
    name: "getProcessLogs",
    description: "Get static logs for a process. Requires connect() first.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        endOffset: { type: "integer", minimum: 0 },
        limit: { type: "integer", minimum: 0 }
      },
      required: ["name", "endOffset", "limit"],
      additionalProperties: false
    }
  }
];

async function requestJson(method, path, body) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    let errorText = "";
    try {
      errorText = await response.text();
    } catch {
      errorText = "";
    }
    const suffix = errorText ? `: ${errorText}` : "";
    throw new Error(`Request failed (${response.status} ${response.statusText})${suffix}`);
  }

  return response.json();
}

function encodeName(name) {
  return encodeURIComponent(name);
}

const server = new Server(
  {
    name: "process-compose-mcp",
    version: "0.3.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    const schema = toolSchemas[name];
    if (!schema) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const input = schema.parse(args ?? {});

    // Handle connect
    if (name === "connect") {
      baseUrl = `http://localhost:${input.port}`;
      // Verify connectivity
      try {
        await requestJson("GET", "/live");
      } catch (e) {
        baseUrl = null;
        throw new Error(`Failed to connect to process-compose on port ${input.port}: ${e.message}`);
      }
      return {
        content: [
          {
            type: "text",
            text: `Connected to process-compose on port ${input.port}`
          }
        ]
      };
    }

    // All other tools require connection
    if (!baseUrl) {
      return {
        content: [
          {
            type: "text",
            text: notConnectedError
          }
        ],
        isError: true
      };
    }

    let result;

    switch (name) {
      case "isAlive":
        result = await requestJson("GET", "/live");
        break;
      case "getProcesses":
        result = await requestJson("GET", "/processes");
        break;
      case "stopProcesses":
        result = await requestJson("PATCH", "/processes/stop", input.names);
        break;
      case "getDependencyGraph":
        result = await requestJson("GET", "/graph");
        break;
      case "getProjectName":
        result = await requestJson("GET", "/project/name");
        break;
      case "getProjectState":
        result = await requestJson("GET", "/project/state");
        break;
      case "getProcess":
        result = await requestJson("GET", `/process/${encodeName(input.name)}`);
        break;
      case "getProcessPorts":
        result = await requestJson("GET", `/process/ports/${encodeName(input.name)}`);
        break;
      case "getProcessInfo":
        result = await requestJson("GET", `/process/info/${encodeName(input.name)}`);
        break;
      case "stopProcess":
        result = await requestJson("PATCH", `/process/stop/${encodeName(input.name)}`);
        break;
      case "startProcess":
        result = await requestJson("POST", `/process/start/${encodeName(input.name)}`);
        break;
      case "restartProcess":
        result = await requestJson("POST", `/process/restart/${encodeName(input.name)}`);
        break;
      case "getProcessLogs":
        result = await requestJson(
          "GET",
          `/process/logs/${encodeName(input.name)}/${input.endOffset}/${input.limit}`
        );
        break;
      default:
        throw new Error(`Unhandled tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: error instanceof Error ? error.message : String(error)
        }
      ],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
