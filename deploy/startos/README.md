<p align="center">
  <img src="icon.png" alt="PhotoCraft Logo" width="21%" />
</p>

# PhotoCraft on StartOS

> Everything not listed in this document should behave the same as upstream
> PhotoCraft. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

PhotoCraft is a clean-room reimplementation of Adobe Photoshop in Rust: layers, masks, adjustment layers, layer styles, type, vectors, brushes, filters and PSD files ([storytold/photocraft](https://github.com/storytold/photocraft)). This package serves three things: the browser edition of the editor, a file exchange for the workspace directory, and an MCP endpoint that lets AI agents edit the files in that workspace with the headless engine.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Both images are built from this repository's source by the package's own Dockerfiles. Upstream publishes no container image.

| Image   | Dockerfile               | Contents                                                                                     |
| ------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| `web`   | `web.Dockerfile`         | The WebAssembly editor built with Trunk, served by nginx (upstream's recipe, package config) |
| `agent` | `agent.Dockerfile`       | `photocraft-cli`, mcp-proxy on loopback, and nginx bearer authentication on the exposed port |

Architectures: x86_64, aarch64.

Subcontainers and daemons:

| Subcontainer | Image   | Daemon      | Runs as         | Process                                                                    |
| ------------ | ------- | ----------- | --------------- | -------------------------------------------------------------------------- |
| `web-sub`    | `web`   | `web`       | `nginx` (101)   | `nginx -g 'daemon off;'` on ports 8080 (editor) and 8081 (file exchange)   |
| `agent-sub`  | `agent` | `mcp`       | `photocraft` (101) | `photocraft-mcp-gateway`: mcp-proxy on loopback port 8083 behind authenticated nginx on port 8082 |
| `agent-sub`  | `agent` | `workspace` (oneshot) | `root` | creates `/data/workspace`, `/data/workspace/inbox`, `/data/workspace/out` and `/data/nginx-tmp` before every start |

mcp-proxy starts one `photocraft-cli mcp` process and keeps it for its lifetime. Every MCP client shares that one engine session.

## Volume and Data Layout

The workspace is the only data. Both subcontainers mount the same volume.

| Volume    | Mount point | Contents                                                                                  |
| --------- | ----------- | ----------------------------------------------------------------------------------------- |
| `main`    | `/data`     | `workspace/` with ready-to-use `inbox/` and `out/`, plus `nginx-tmp/` upload staging |
| `startos` | not mounted | `store.json`                                                                              |

The editor keeps no data on the server: it opens and saves files on the user's computer, and keeps preferences in the browser's local storage.

## File Models

One model, `startos/fileModels/store.json.ts`, maps `store.json` on the `startos` volume. It holds `mcpToken` and `filesPassword`. The **Set Agent Credentials** action is its only writer. On start, `main.ts` writes only the file password hash into the web container and only the MCP token into the agent container's ephemeral root filesystem; the `startos` volume remains unmounted.

The package writes no upstream configuration file. nginx reads the `nginx.conf` baked into the `web` image, and `photocraft-cli` takes its two root directories from the command line.

## Dependencies

None.

## Network Access and Interfaces

One host, `main`, carries three bindings. The OS reverse proxy terminates TLS and checks credentials on the file and MCP interfaces. Their raw listeners repeat the same checks so another installed package cannot bypass the public proxy.

| Interface id | Type  | Port | Gate at the proxy                              | Serves                                                                                         |
| ------------ | ----- | ---- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `ui`         | `ui`  | 8080 | none                                           | The static editor site (`/`), `/healthz`                                                       |
| `files`      | `ui`  | 8081 | HTTP basic, user `photocraft`, `filesPassword` | The workspace: GET downloads, a directory URL lists (HTML), `/.json/<dir>/` lists as JSON, PUT uploads, DELETE, MKCOL, COPY, MOVE; uploads up to 4 GiB |
| `mcp`        | `api` | 8082 | HTTP bearer, `mcpToken`                        | MCP over Streamable HTTP at `/mcp` (also `/sse`), `/status`                                    |

`files` and `mcp` are exported only once both credentials exist in `store.json`. The editor port is ungated on purpose: it serves a static site and nothing of the user's.

## Installation and First-Run Flow

Install raises the critical task described under [Tasks](#tasks); the service does not start until **Set Agent Credentials** has run. The action stores both credentials, `setupInterfaces` binds the gated ports, and the first start creates `/data/workspace/inbox` and `/data/workspace/out`. No upstream setup wizard exists.

## Actions

**Set Agent Credentials** (`set-agent-credentials`): run it on install and whenever credentials must be rotated. Its masked input form generates a 64-character bearer token and a 32-character password; copy them before submitting. The action writes them to `store.json` but does not return them in its result, because StartOS can record action responses in package logs. A credential change restarts the web and MCP listeners with new in-container gates. Every agent must then be reconfigured. No action is hidden.

## Tasks

One task. `startos/init/watchCredentials.ts` raises a **critical** task pointing to **Set Agent Credentials** while `store.json` lacks `mcpToken` or `filesPassword`. Running the action clears it. It cannot return unless `store.json` is removed, because the action never unsets the values.

## Health Checks

Both checks exercise application behavior, including rejection of anonymous raw-port requests.

| Check                         | Probes                | A failure means                                                                                                                                             |
| ----------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web` daemon: Editor and File Exchange | editor `/healthz` returns `ok` and anonymous raw file access is rejected | nginx, the editor, or the file-auth gate is not ready. |
| `mcp` daemon: MCP Endpoint    | anonymous `/status` is rejected and authenticated `/status` reports the default backend configured | nginx, mcp-proxy, the token gate, or `photocraft-cli` is not ready. |

The gateway supervisor exits if either nginx or mcp-proxy exits, so StartOS can report and restart the failed daemon.

## Backups and Restore

Strategy: both volumes are copied wholesale (`sdk.Backups.ofVolumes('main', 'startos')`). The workspace and `store.json` are captured together, so a restored instance has its photos and the credentials that gate them. Nothing is excluded. After a restore the service is usable at once; agents keep their configured token.

## Limitations and Differences

1. The editor is upstream's browser edition: no desktop control channel, no server-side storage, no autosave. It cannot open files from the workspace directly.
2. The MCP server is upstream's headless mode behind mcp-proxy. Bridge-mode tools (`ui_inspect`, `ui_screenshot`, `ui_pointer`, `ui_menu_invoke`, `ui_set`, `control_call`) return the headless error upstream documents.
3. All MCP clients share one engine session. Documents one agent opens are visible to the others; indexes shift when a document is closed.
4. `photocraft-cli`'s own TCP server (`serve --port`) is loopback-only and is not exposed. Only MCP is.
5. The file exchange is plain HTTP methods, not full WebDAV: PROPFIND and LOCK are absent, so a desktop WebDAV mount does not work. Use a browser, `curl`, or `tools/photocraft-remote`.
6. Uploads larger than 4 GiB are refused by nginx.

---

## Quick Reference for AI Consumers

```yaml
package_id: photocraft
image: built from source (deploy/startos/web.Dockerfile, deploy/startos/agent.Dockerfile)
architectures: [x86_64, aarch64]
subcontainers: [web-sub, agent-sub]
volumes:
  main: /data
  startos: not mounted
file_models:
  - store.json (startos volume)
startos_managed_env_vars: []
dependencies: none
interfaces:
  ui: { type: ui, port: 8080 }
  files: { type: ui, port: 8081 }
  mcp: { type: api, port: 8082 }
actions:
  - set-agent-credentials
tasks:
  - { action: set-agent-credentials, severity: critical }
health_checks:
  - web (editor response plus anonymous-file rejection)
  - mcp (authenticated backend status plus anonymous-request rejection)
```
