# syntax=docker/dockerfile:1
# The `web` image of the StartOS package: the browser editor and the workspace
# file exchange, served by nginx. This is the repository's own Dockerfile (the
# community web hosting recipe) with the package's nginx.conf. The build
# context is the repository root; startos/manifest/index.ts sets it.
#
# Keep RUST_VERSION >= the workspace `rust-version` in Cargo.toml and
# TRUNK_VERSION equal to the `web` job of .github/workflows/release.yml.
ARG RUST_VERSION=1.99
ARG NGINX_VERSION=1.28-alpine

FROM alpine:3.22 AS craft-fonts
ARG CRAFT_FONTS_COMMIT=3d9ab3a132ed0eff457e424226a435a901da30d3
ARG CRAFT_FONTS_SHA256=bb8c4d2c32148760d2d47d77e8b222bc2b22fda1e85fcd72290fe7bfbb4689ee
RUN apk add --no-cache ca-certificates curl tar \
    && curl -fsSL --retry 3 -A Photocraft-dev \
       "https://github.com/storytold/craft-fonts/archive/${CRAFT_FONTS_COMMIT}.tar.gz" \
       -o /tmp/craft-fonts.tar.gz \
    && echo "${CRAFT_FONTS_SHA256}  /tmp/craft-fonts.tar.gz" | sha256sum -c - \
    && mkdir -p /fonts /tmp/craft-fonts \
    && tar -xzf /tmp/craft-fonts.tar.gz --strip-components=1 -C /tmp/craft-fonts \
    && cp -a /tmp/craft-fonts/fonts/. /fonts/

FROM rust:${RUST_VERSION}-slim-bookworm AS builder
ARG TRUNK_VERSION=0.21.14
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && rustup target add wasm32-unknown-unknown
RUN set -eu; \
    case "$(uname -m)" in \
        x86_64) arch=x86_64 ;; \
        aarch64) arch=aarch64 ;; \
        *) echo 'The web builder supports amd64 and arm64' >&2; exit 1 ;; \
    esac; \
    asset="trunk-${arch}-unknown-linux-musl.tar.gz"; \
    url="https://github.com/trunk-rs/trunk/releases/download/v${TRUNK_VERSION}"; \
    cd /tmp; \
    curl -fsSL --retry 3 -A Photocraft-dev "$url/$asset" -o "$asset"; \
    curl -fsSL --retry 3 -A Photocraft-dev "$url/$asset.sha256" -o "$asset.sha256"; \
    printf '%s  %s\n' "$(cat "$asset.sha256")" "$asset" | sha256sum -c -; \
    tar -xzf "$asset" -C /usr/local/bin trunk; \
    rm "$asset" "$asset.sha256"; \
    trunk --version

WORKDIR /src
COPY . .
WORKDIR /src/apps/photocraft-web
# Thin LTO uses less build memory than the release zip's fat LTO.
ARG CARGO_PROFILE_WASM_RELEASE_LTO=thin
ARG CARGO_BUILD_JOBS=2
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/src/target \
    --mount=type=cache,target=/root/.cache/trunk \
    trunk build --release --locked \
    && test -s /src/dist/web/index.html \
    && gzip -9 -k /src/dist/web/*.wasm /src/dist/web/*.js /src/dist/web/index.html

FROM nginx:${NGINX_VERSION} AS runtime
RUN apk add --no-cache curl
COPY deploy/startos/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /src/dist/web/ /usr/share/nginx/html/
COPY --from=craft-fonts /fonts/ /usr/share/nginx/html/fonts/
COPY deploy/startos/icon.png /usr/share/nginx/html/favicon.png
COPY LICENSE-MIT LICENSE-APACHE NOTICE ATTRIBUTION.md /usr/share/nginx/html/
COPY assets/fonts/OFL-*.txt assets/icons/LICENSE-*.txt assets/dict/LICENSE-*.txt \
    crates/ui-egui/src/i18n/LICENSE-translations.txt /usr/share/nginx/html/licenses/
COPY --chmod=755 deploy/startos/web-health /usr/local/bin/photocraft-web-health
# The `nginx` user is uid 101, the uid the `agent` image runs photocraft-cli
# as, so both can write the workspace volume.
USER nginx
EXPOSE 8080 8081
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
