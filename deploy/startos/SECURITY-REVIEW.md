# Security review of PhotoCraft for this package

Scope: the PhotoCraft source at the commit this package was first built from (`main`, 127 commits after `v0.9.0`, identical to upstream `storytold/photocraft` at that time), reviewed read-only for self-hosting on StartOS with AI agents connected. Date: 2026-10-15.

Verdict: **safe with caveats.** The automation surface this package exposes is designed defensively and the code matches the claims in `SECURITY.md`. The caveats are supply-chain items, listed below with what the package does about each.

## What the package relies on

| Property | Evidence in the source |
| --- | --- |
| `photocraft-cli serve` binds `127.0.0.1` only and refuses a non-loopback address; `mcp` is stdio only | `apps/photocraft-cli/src/lib.rs` (`serve` address literal and loopback check), `crates/automation/src/rpc.rs` |
| Every automation file access goes through two directory capabilities (read root, write root) opened once with `cap-std`; absolute paths, `..`, backslashes, device names and symlink escapes are rejected before any file effect; an omitted root denies that direction | `crates/automation/src/workspace.rs`, with tests for traversal and symlink escapes |
| Engine commands that take ambient paths are denied at the automation boundary, including when an action replays them | `crates/automation/src/workspace.rs` (`authorize_engine_command`), `crates/automation/src/headless.rs` |
| Request lines are capped at 1 MiB, replies at 8 MiB, batches at 256 steps; previews are capped in size | `crates/automation/src/security.rs`, `crates/automation/src/server/transport.rs` |
| Plug-ins are WebAssembly run by `wasmi` with no host imports, fuel, memory and wall-clock limits | `crates/plugins/src/runtime.rs`, `docs/plugins.md` |
| No outbound network calls, telemetry, update checks or crash reporting in PhotoCraft's own code; the only socket connect is the loopback bridge to a desktop app | grep of the crates; `crates/automation/src/bridge.rs` |
| `unsafe_code = "forbid"` for the whole workspace, except three macOS AppKit calls in `crates/tablet` | `Cargo.toml`, `crates/tablet/Cargo.toml` |
| The web build fetches only same-origin relative paths (`fonts/manifest.txt` and the fonts it lists); no CDN, no analytics | `apps/photocraft-web/src/web.rs`, `crates/text/src/served.rs` |

## Caveats and how the package handles them

| # | Caveat | Severity | Package response |
| --- | --- | --- | --- |
| 1 | Three git dependencies pinned by commit (`craft-ui`, `craft-print` from `storytold/craft-libs`, and `winprint` through `craft-print`). `winprint` pulls `reqwest` and `sigstore` crates. | medium | `cargo tree --target x86_64-unknown-linux-gnu -i reqwest` for `photocraft-cli` prints nothing: on Linux the CLI does not contain `reqwest`, `cmake` or any `*-sys` crate except `linux-raw-sys`. The `agent` image builds only `photocraft-cli`. |
| 2 | Upstream release CI calls reusable workflows at `storytold/craft-common-actions@main` (not SHA-pinned) with signing secrets. | medium | Irrelevant to this package: it never uses upstream release artifacts. Both images build from the checked-out source with `--locked`. |
| 3 | No `cargo-audit` or `cargo-deny` job upstream. | low | Not added here either; the lockfile is upstream's. Run `cargo audit` in the fork before a bump. |
| 4 | The upstream `Dockerfile` (and `web.Dockerfile` here) downloads Trunk from GitHub releases and checks it against the `.sha256` from the same release (trust on first use over TLS). | low | Kept as upstream ships it. The pin is a version, the download is checksummed. |
| 5 | The automation command authorizer is a denylist. A future engine command that takes a path under a new parameter name could slip through. | low | Mitigated by the container: the `agent` subcontainer sees only the `main` volume at `/data`, and runs as an unprivileged user. |
| 6 | The MCP transport has no per-tool capability scopes: an authenticated client gets the whole tool surface. | info | The bearer token is checked both inside the package and at the StartOS proxy. Rotate it with **Set Agent Credentials** when an agent is retired. |
| 7 | Upstream advises against proxying the control protocol off-host. | info | The package does not proxy `serve`. It exposes MCP through mcp-proxy, and StartOS adds TLS and the bearer check in front of it. |

## What the package adds

| Component | Pin | Why it is acceptable |
| --- | --- | --- |
| nginx (official `nginx:<version>-alpine` image, nginx.org build) | tag in `web.Dockerfile` | Upstream's own hosting recipe. The file exchange uses the core `ngx_http_dav_module` (PUT, DELETE, MKCOL, COPY, MOVE). nginx normalizes `..` before the filesystem is touched (a `GET /../../etc/passwd` returns 400 in a local test). |
| mcp-proxy and its 32 dependencies | `gateway/requirements.txt`, every package pinned with sha256 hashes, installed with `--require-hashes --no-deps` | It binds loopback only. nginx checks the bearer token on the exposed port before forwarding to it; the StartOS proxy repeats the check. |
| Python base image | `python:<version>-slim-bookworm` | Official image. |
| Rust builder | `rust:<version>-slim-bookworm` | Official image, same as upstream's Dockerfile. |

## Not verified

- Behaviour on a real StartOS server. A green type check and a local nginx test are not a running install.
- The contents of `storytold/craft-common-actions` (upstream release CI). Not used by this package.
- Vulnerable crate versions in `Cargo.lock` (`cargo audit` was not run).
