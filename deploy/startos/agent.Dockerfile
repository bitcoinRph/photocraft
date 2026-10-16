# syntax=docker/dockerfile:1
# The `agent` image of the StartOS package: photocraft-cli (the headless
# engine and its MCP server) behind mcp-proxy, which serves MCP over
# Streamable HTTP. The build context is the repository root;
# startos/manifest/index.ts sets it.
#
# Keep RUST_VERSION >= the workspace `rust-version` in Cargo.toml.
ARG RUST_VERSION=1.99
ARG PYTHON_VERSION=3.13

FROM rust:${RUST_VERSION}-slim-bookworm AS builder
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
# `--features heif` matches the official builds (packaging/linux/package.sh).
# On Linux the CLI links only glibc and libgcc; it needs no system libraries.
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/src/target \
    cargo build --release --locked -p photocraft-cli --features heif \
    && install -m 755 target/release/photocraft-cli /photocraft-cli

FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime
# uid 101 is the `nginx` user of the `web` image; both images write the
# workspace volume as the same uid.
RUN groupadd --gid 101 photocraft \
    && useradd --uid 101 --gid 101 --system --no-create-home \
       --home-dir /data --shell /usr/sbin/nologin photocraft
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*
# Every package and version is pinned in gateway/requirements.txt, with hashes.
COPY deploy/startos/gateway/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --disable-pip-version-check --require-hashes \
        --no-deps -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt
COPY --from=builder /photocraft-cli /usr/local/bin/photocraft-cli
COPY --chmod=755 deploy/startos/photocraft-mcp-gateway /usr/local/bin/photocraft-mcp-gateway
COPY --chmod=755 deploy/startos/mcp-health.py /usr/local/bin/photocraft-mcp-health
COPY deploy/startos/mcp-nginx.conf /etc/photocraft/mcp-nginx.conf
USER photocraft
EXPOSE 8082
CMD ["photocraft-mcp-gateway"]
