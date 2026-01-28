#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const baseUrlArg = process.argv[2] || process.env.PROCESS_COMPOSE_URL;
if (!baseUrlArg) {
  console.error("Usage: process-compose-mcp <baseUrl> (or set PROCESS_COMPOSE_URL)");
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/+$/, "");

const toolSchemas = {
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
    name: "isAlive",
    description: "Check if the process-compose server is responding.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "getProcesses",
    description: "Get all configured processes and their status.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "stopProcesses",
    description: "Stop multiple processes by name.",
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
    description: "Get the process dependency graph with current status.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "getProjectName",
    description: "Get the current project name.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "getProjectState",
    description: "Get the current project state.",
    inputSchema: {
      type: "object",
      additionalProperties: false
    }
  },
  {
    name: "getProcess",
    description: "Get a single process state.",
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
    description: "Get open TCP/UDP ports for a process.",
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
    description: "Get a process configuration.",
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
    description: "Stop a single process by name.",
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
    description: "Start a single process by name.",
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
    description: "Restart a single process by name.",
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
    description: "Get static logs for a process.",
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
    version: "0.1.0"
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
