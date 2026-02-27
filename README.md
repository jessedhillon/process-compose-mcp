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

If you omit the URL, it will default to `http://localhost:8080` and can be overridden by `PC_PORT_NUM`.

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
