import { i18n } from './i18n'
import { sdk } from './sdk'
import { mcpPort, uiPort, workspaceDir } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting PhotoCraft!'))

  // Both containers see the `main` volume at /data. The editor's static site
  // needs no volume; nginx also serves the workspace as the file exchange.
  const mounts = sdk.Mounts.of().mountVolume({
    volumeId: 'main',
    subpath: null,
    mountpoint: '/data',
    readonly: false,
  })
  const agentSub = sdk.SubContainer.of(
    effects,
    { imageId: 'agent' },
    mounts,
    'agent-sub',
  )

  return (
    sdk.Daemons.of(effects)
      // The workspace is created by root once per start, owned by the one
      // unprivileged user both images run as (see the Dockerfiles).
      .addOneshot('workspace', {
        subcontainer: agentSub,
        exec: {
          command: [
            'install',
            '-d',
            '-o',
            'photocraft',
            '-g',
            'photocraft',
            workspaceDir,
            '/data/nginx-tmp',
          ],
          user: 'root',
        },
        requires: [],
      })
      .addDaemon('web', {
        subcontainer: sdk.SubContainer.of(
          effects,
          { imageId: 'web' },
          mounts,
          'web-sub',
        ),
        exec: { command: sdk.useEntrypoint(), user: 'nginx' },
        ready: {
          display: i18n('Editor'),
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, uiPort, {
              successMessage: i18n('The editor is ready'),
              errorMessage: i18n('The editor is not ready'),
            }),
        },
        requires: ['workspace'],
      })
      .addDaemon('mcp', {
        subcontainer: agentSub,
        exec: { command: ['photocraft-mcp-gateway'], user: 'photocraft' },
        ready: {
          display: i18n('MCP Endpoint'),
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, mcpPort, {
              successMessage: i18n('The MCP endpoint is ready'),
              errorMessage: i18n('The MCP endpoint is not ready'),
            }),
        },
        requires: ['workspace'],
      })
  )
})
