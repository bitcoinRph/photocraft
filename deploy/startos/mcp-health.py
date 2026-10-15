#!/usr/bin/env python3
"""Verify the raw MCP listener rejects anonymous requests and serves MCP."""

from __future__ import annotations

import json
import pathlib
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8082"
token = pathlib.Path("/etc/photocraft/mcp-token").read_text(encoding="ascii").strip()

try:
    urllib.request.urlopen(f"{BASE}/status", timeout=5)
except urllib.error.HTTPError as error:
    if error.code != 401:
        raise
else:
    raise SystemExit("anonymous MCP health request was accepted")

request = urllib.request.Request(
    f"{BASE}/status", headers={"Authorization": f"Bearer {token}"}
)
with urllib.request.urlopen(request, timeout=5) as response:
    status = json.load(response)

if status.get("server_instances", {}).get("default") != "configured":
    raise SystemExit("MCP backend is not configured")
