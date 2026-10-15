import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('../', import.meta.url).pathname
const read = (path) => readFile(join(root, path), 'utf8')

const [
  nginx,
  gateway,
  gatewayNginx,
  main,
  webDockerfile,
  agentDockerfile,
  workflow,
  instructions,
  version,
  credentialsAction,
  webHealth,
] = await Promise.all([
  read('nginx.conf'),
  read('photocraft-mcp-gateway'),
  read('mcp-nginx.conf'),
  read('startos/main.ts'),
  read('web.Dockerfile'),
  read('agent.Dockerfile'),
  read('../../.github/workflows/startos.yml'),
  read('instructions.md'),
  read('startos/versions/current.ts'),
  read('startos/actions/setAgentCredentials.ts'),
  read('web-health'),
])

assert.match(nginx, /auth_basic\s+"PhotoCraft";/)
assert.match(nginx, /auth_basic_user_file\s+\/etc\/nginx\/\.htpasswd;/)
assert.match(
  nginx,
  /location = \/fonts\/manifest\.txt[\s\S]*Cache-Control no-cache/,
)
assert.match(nginx, /location = \/favicon\.ico/)

assert.match(gateway, /127\.0\.0\.1/)
assert.match(gateway, /8083/)
assert.match(gateway, /nginx/)
assert.match(gateway, /MCP token is invalid/)
assert.match(gatewayNginx, /listen 8082/)
assert.match(gatewayNginx, /map_hash_bucket_size 128/)
assert.match(gatewayNginx, /Bearer __MCP_TOKEN__/)
assert.match(gatewayNginx, /proxy_pass http:\/\/127\.0\.0\.1:8083/)
assert.match(gatewayNginx, /proxy_buffering off/)

assert.match(main, /Daemons\.dynamic/)
assert.match(main, /\.htpasswd/)
assert.match(main, /mcp-token/)
assert.match(main, /credentialDigest/)
assert.match(main, /`\$\{workspaceDir\}\/inbox`/)
assert.match(main, /`\$\{workspaceDir\}\/out`/)
assert.match(main, /runHealthScript/)
assert.match(main, /files-health-password/)
assert.match(main, /\{SSHA\}/)

assert.match(
  webDockerfile,
  /CRAFT_FONTS_COMMIT=3d9ab3a132ed0eff457e424226a435a901da30d3/,
)
assert.match(
  webDockerfile,
  /CRAFT_FONTS_SHA256=bb8c4d2c32148760d2d47d77e8b222bc2b22fda1e85fcd72290fe7bfbb4689ee/,
)
assert.match(
  webDockerfile,
  /COPY --from=craft-fonts \/fonts\/ \/usr\/share\/nginx\/html\/fonts\//,
)
assert.match(webDockerfile, /favicon\.png/)
assert.match(agentDockerfile, /apt-get install[^\n]*nginx/)
assert.match(agentDockerfile, /mcp-nginx\.conf/)
assert.match(webDockerfile, /apk add --no-cache curl/)

assert.match(credentialsAction, /Action\.withInput/)
assert.match(credentialsAction, /masked: true/)
assert.doesNotMatch(credentialsAction, /result:/)
assert.doesNotMatch(credentialsAction, /value: mcpToken/)
assert.doesNotMatch(credentialsAction, /value: filesPassword/)

assert.match(webHealth, /%\{http_code\}/)
assert.match(webHealth, /anonymous_status.*401/s)
assert.match(webHealth, /authenticated_status.*200/s)

assert.doesNotMatch(
  workflow,
  /Start9Labs\/start-technologies\/.github\/actions\/[^\s]+@master/,
)
assert.match(workflow, /@[0-9a-f]{40}/)

assert.match(instructions, /created automatically/)
assert.doesNotMatch(instructions, /<mcp-endpoint-address>\/mcp/)
assert.match(version, /version: '0\.9\.0:2'/)

console.log('PhotoCraft StartOS package hardening checks passed')
