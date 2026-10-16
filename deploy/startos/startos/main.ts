import { createHash, randomBytes } from 'node:crypto'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { mcpPort, uiPort, workspaceDir } from './utils'

const lockedMcpToken = randomBytes(32).toString('hex')
const lockedFilesPassword = randomBytes(32).toString('hex')
const filesHealthPassword = randomBytes(32).toString('hex')

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex')

const htpasswdSsha = (password: string) => {
  const salt = randomBytes(16)
  const hash = createHash('sha1').update(password).update(salt).digest()
  return `{SSHA}${Buffer.concat([hash, salt]).toString('base64')}`
}

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting PhotoCraft!'))

  return sdk.Daemons.dynamic(effects, async ({ effects }) => {
    const store = await storeJson.read().const(effects)
    const mcpToken = store?.mcpToken || lockedMcpToken
    const filesPassword = store?.filesPassword || lockedFilesPassword
    const credentialDigest = digest(`${mcpToken}\0${filesPassword}`)

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
    const webSub = sdk.SubContainer.of(
      effects,
      { imageId: 'web' },
      mounts,
      'web-sub',
    )

    return sdk.Daemons.of(effects)
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
            `${workspaceDir}/inbox`,
            `${workspaceDir}/out`,
            '/data/nginx-tmp',
          ],
          user: 'root',
        },
        requires: [],
      })
      .addDaemon('web', {
        subcontainer: webSub,
        exec: {
          fn: async (subcontainer) => {
            await subcontainer.writeFile(
              '/etc/nginx/.htpasswd',
              `photocraft:${htpasswdSsha(filesPassword)}\nphotocraft-health:${htpasswdSsha(filesHealthPassword)}\n`,
              { mode: 0o600 },
            )
            await subcontainer.writeFile(
              '/etc/photocraft/files-health-password',
              `${filesHealthPassword}\n`,
              { mode: 0o600 },
            )
            await subcontainer.execFail(
              [
                'chown',
                'nginx:nginx',
                '/etc/nginx/.htpasswd',
                '/etc/photocraft/files-health-password',
              ],
              { user: 'root' },
            )
            return { command: sdk.useEntrypoint(), user: 'nginx' }
          },
        },
        ready: {
          display: i18n('Editor'),
          fn: () =>
            sdk.healthCheck.runHealthScript(['photocraft-web-health'], webSub, {
              errorMessage: i18n('The editor is not ready'),
              message: () => i18n('The editor is ready'),
            }),
        },
        requires: ['workspace'],
        uses: { credentialDigest },
      })
      .addDaemon('mcp', {
        subcontainer: agentSub,
        exec: {
          fn: async (subcontainer) => {
            await subcontainer.writeFile(
              '/etc/photocraft/mcp-token',
              `${mcpToken}\n`,
              { mode: 0o600 },
            )
            await subcontainer.execFail(
              ['chown', 'photocraft:photocraft', '/etc/photocraft/mcp-token'],
              { user: 'root' },
            )
            return {
              command: ['photocraft-mcp-gateway'],
              user: 'photocraft',
            }
          },
        },
        ready: {
          display: i18n('MCP Endpoint'),
          fn: () =>
            sdk.healthCheck.runHealthScript(
              ['photocraft-mcp-health'],
              agentSub,
              {
                errorMessage: i18n('The MCP endpoint is not ready'),
                message: () => i18n('The MCP endpoint is ready'),
              },
            ),
        },
        requires: ['workspace'],
        uses: { credentialDigest, port: mcpPort, uiPort },
      })
  })
})
