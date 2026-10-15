# PhotoCraft

## Documentation

- [PhotoCraft README](https://github.com/storytold/photocraft/blob/main/README.md) — the upstream overview of the editor
- [Development guide](https://github.com/storytold/photocraft/blob/main/docs/development.md) — the headless CLI and the MCP server
- [MCP conventions](https://github.com/storytold/photocraft/blob/main/docs/mcp.md) — the MCP tools, batches and the undo rules
- [Control protocol](https://github.com/storytold/photocraft/blob/main/docs/control-protocol.md) — the engine commands and their parameters
- [Web hosting notes](https://github.com/storytold/photocraft/blob/main/packaging/web/README.md) — what the browser edition can and cannot do

## What you get on StartOS

- **Editor**: PhotoCraft in your browser. It opens files from your computer and saves back to your computer.
- **File Exchange**: a workspace directory on your server. You and your agents put photos in and take results out.
- **MCP Endpoint**: an MCP server for AI agents. An agent opens, edits and saves the photos in the workspace with the same commands the editor uses.

## Getting set up

1. Open the **Actions** tab and run **Set Agent Credentials**. Copy the MCP bearer token and the file exchange password. The action shows them once. Run it again to get new ones.
2. Start the service.
3. Open the **Interfaces** tab. Copy the **File Exchange** address and the **MCP Endpoint** address.
4. If you connect over LAN, trust your server's root certificate on each computer that runs an agent. StartOS shows how on its **System › Root CA** page.

## Using PhotoCraft

### Editor

Click **Editor** on the Dashboard. The editor runs in your browser and keeps nothing on the server. Save or export your work before you close the tab. A browser with WebGPU or WebGL2 is required.

### File Exchange

Open the **File Exchange** address in a browser. Sign in with the user name `photocraft` and the password from **Set Agent Credentials**. The page lists the workspace. Click a file to download it.

To upload a file, send an HTTP PUT with the same credentials. For example:

```sh
curl -u photocraft:<password> -T photo.jpg https://<file-exchange-address>/inbox/photo.jpg
```

`tools/photocraft-remote` in the package repository wraps these requests: `ls`, `put`, `get`, `rm`, `mkdir`.

### Connecting an agent

The MCP Endpoint speaks MCP over Streamable HTTP. Every request must carry the header `Authorization: Bearer <token>`.

Claude Code:

```sh
claude mcp add --transport http photocraft https://<mcp-endpoint-address>/mcp \
  --header "Authorization: Bearer <token>"
```

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.photocraft]
url = "https://<mcp-endpoint-address>/mcp"
bearer_token_env_var = "PHOTOCRAFT_MCP_TOKEN"
```

Hermes Agent (`~/.hermes/config.yaml`):

```yaml
mcp_servers:
  photocraft:
    url: "https://<mcp-endpoint-address>/mcp"
    headers:
      Authorization: "Bearer ${PHOTOCRAFT_MCP_TOKEN}"
```

Then ask the agent to list the workspace, open a photo, and edit it. Paths are relative to the workspace. A typical request: "Open `inbox/photo.jpg`, straighten and brighten it, add a Curves adjustment, and save it as `out/photo-edited.png`."

### Actions

- **Set Agent Credentials** generates a new MCP token and a new file exchange password. Every agent must then be given the new token.

## Limitations

- The Editor cannot open files from the File Exchange directly. Download a file first, or let an agent work on it through the MCP Endpoint.
- All agents share one editing session on the server. An agent that opens a document sees the documents other agents left open. Save and close documents when a job is done.
- Onion addresses need a Tor-aware client. Use `torsocks` or a LAN address for agents.
