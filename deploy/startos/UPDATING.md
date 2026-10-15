# Updating the upstream version

This package lives inside a fork of PhotoCraft. "Upstream" is [storytold/photocraft](https://github.com/storytold/photocraft). Both images build from the checkout the package sits in, so the packaged version is the checkout's version.

## Determining the upstream version

- **PhotoCraft**: the workspace version in `Cargo.toml` at the repository root (`[workspace.package] version`). Upstream tags releases as `v<version>`.

  ```sh
  git -C ../.. describe --tags --abbrev=0
  grep -m1 '^version' ../../Cargo.toml
  ```

- **Rust toolchain**: `RUST_VERSION` in `web.Dockerfile` and `agent.Dockerfile`. Keep it at or above `rust-version` in `Cargo.toml`.
- **Trunk**: `TRUNK_VERSION` in `web.Dockerfile`. Keep it equal to the `web` job of `.github/workflows/release.yml`.
- **nginx**: `NGINX_VERSION` in `web.Dockerfile`, an `nginx:<version>-alpine` tag.
- **mcp-proxy**: `gateway/requirements.txt`, pinned with hashes.

## Applying the bump

1. Merge the upstream tag into the fork: `git merge v<version>`.
2. Set `version` in `startos/versions/current.ts` to `<version>:0` and write the release notes.
3. Compare the upstream `Dockerfile` with `web.Dockerfile` and carry over any change to the builder stage.
4. If the mcp-proxy pin changes, create a fresh virtualenv, run `pip install mcp-proxy==<new>`, run `pip freeze`, and regenerate `gateway/requirements.txt` with one `--hash=sha256:` line per Linux wheel of each package (the PyPI JSON API lists them).
5. Run `make x86` or push and let the StartOS workflow build both architectures.
6. Install the package on a StartOS server and test the Editor, a file upload, and one MCP tool call.
