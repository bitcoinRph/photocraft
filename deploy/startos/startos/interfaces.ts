import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { filesPort, filesUsername, mcpPort, uiPort } from './utils'

export const mainHostId = 'main'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const main = sdk.MultiHost.of(effects, mainHostId)
  const receipts = []

  // The editor runs entirely in the browser and stores nothing on the server,
  // so its page is served without a gate, as upstream hosts it.
  const uiOrigin = await main.bindPort(uiPort, { protocol: 'http' })
  receipts.push(
    await uiOrigin.export([
      sdk.createInterface(effects, {
        name: i18n('Editor'),
        id: 'ui',
        description: i18n('PhotoCraft in your browser'),
        type: 'ui',
        masked: false,
        schemeOverride: null,
        username: null,
        path: '',
        query: {},
      }),
    ]),
  )

  // The file exchange and the MCP endpoint read and write the workspace, so
  // the OS reverse proxy gates them. They appear once the credentials exist.
  const store = await storeJson.read().const(effects)
  if (!store?.mcpToken || !store?.filesPassword) return receipts

  const filesOrigin = await main.bindPort(filesPort, {
    protocol: 'http',
    addSsl: {
      auth: {
        type: 'basic',
        credentials: [
          { username: filesUsername, password: store.filesPassword },
        ],
        realm: 'PhotoCraft',
      },
    },
  })
  receipts.push(
    await filesOrigin.export([
      sdk.createInterface(effects, {
        name: i18n('File Exchange'),
        id: 'files',
        description: i18n(
          'The workspace directory: browse and download in a browser, upload with HTTP PUT',
        ),
        type: 'ui',
        masked: false,
        schemeOverride: null,
        username: null,
        path: '',
        query: {},
      }),
    ]),
  )

  const mcpOrigin = await main.bindPort(mcpPort, {
    protocol: 'http',
    addSsl: {
      auth: { type: 'bearer', tokens: [store.mcpToken], realm: 'PhotoCraft' },
    },
  })
  receipts.push(
    await mcpOrigin.export([
      sdk.createInterface(effects, {
        name: i18n('MCP Endpoint'),
        id: 'mcp',
        description: i18n(
          'Streamable HTTP MCP server for AI agents (send the bearer token)',
        ),
        type: 'api',
        masked: true,
        schemeOverride: null,
        username: null,
        path: '/mcp',
        query: {},
      }),
    ]),
  )

  return receipts
})
