# process-compose-mcp

MCP server that wraps the process-compose HTTP API.

## Install

```bash
npm install -g process-compose-mcp
```

## Usage

```bash
process-compose-mcp http://localhost:8080
```

You can also set `PROCESS_COMPOSE_URL` instead of passing a URL argument.

## Tools

- `isAlive`
- `getProcesses`
- `stopProcesses`
- `getDependencyGraph`
- `getProjectName`
- `getProjectState`
- `getProcess`
- `getProcessPorts`
- `getProcessInfo`
- `stopProcess`
- `startProcess`
- `restartProcess`
- `getProcessLogs`

## MCP config example

```json
{
  "mcpServers": {
    "processCompose": {
      "command": "process-compose-mcp",
      "args": ["http://localhost:8080"]
    }
  }
}
```
