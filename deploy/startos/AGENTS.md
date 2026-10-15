# AGENTS.md

This directory is a StartOS service package inside a fork of PhotoCraft. It builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`, placed in the directory **above the fork**, so `start-cli` finds `.startos/build.key.pem` when it walks up from here. The official packaging guide is `<workspace>/start-technologies/projects/start-sdk/docs/src/` (or <https://docs.start9.com/packaging>). Start every change at its `recipes.md`.

Keep `README.md` (technical reference) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Two images, both built from this checkout.** `web.Dockerfile` is upstream's `Dockerfile` with the package's `nginx.conf`; diff them after an upstream merge. `agent.Dockerfile` builds `photocraft-cli` and installs `mcp-proxy` from the hash-pinned `gateway/requirements.txt`. The build context is the repository root (`workdir: '../..'` in the manifest), so a file the images need must not be in the root `.dockerignore`.
- **One uid in both images.** nginx runs as uid 101 (`nginx`) and the agent image creates `photocraft` as uid 101. The `workspace` oneshot in `main.ts` creates `/data/workspace` and `/data/nginx-tmp` for that uid. Change the uid in both Dockerfiles together.
- **No auth inside the containers.** The OS reverse proxy gates the file exchange (basic) and the MCP endpoint (bearer) with `addSsl.auth` in `interfaces.ts`. The Editor port is open on purpose: it is a static site.
- **`photocraft-cli` is loopback-only by design.** `serve --port` refuses other addresses and MCP is stdio. mcp-proxy is the network layer; do not try to expose `serve` directly.
- **Do not run `make install`** or sideload to a live server without the user's explicit approval.
- Typecheck with `npm run check` is not defined here; use `npx tsc --noEmit`, `npx prettier --config node_modules/@start9labs/start-sdk/prettier.config.json --check startos`, and `node node_modules/@start9labs/start-sdk/lint.mjs`, which is what `make` runs first.
