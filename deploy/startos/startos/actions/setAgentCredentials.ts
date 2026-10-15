import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { filesUsername } from '../utils'

export const setAgentCredentials = sdk.Action.withoutInput(
  'set-agent-credentials',

  async ({ effects }) => ({
    name: i18n('Set Agent Credentials'),
    description: i18n(
      'Generate the bearer token for the MCP endpoint and the password for the file exchange. Replaces any existing credentials.',
    ),
    warning: (await storeJson.read((s) => s.mcpToken).const(effects))
      ? i18n(
          'This replaces the current token and password. Every connected agent must be given the new ones.',
        )
      : null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const mcpToken = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 64,
    })
    const filesPassword = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    })
    await storeJson.merge(effects, { mcpToken, filesPassword })

    return {
      version: '1',
      title: i18n('Agent Credentials'),
      message: i18n(
        'Give the MCP token to each agent as `Authorization: Bearer <token>`. Use the user name and password for the file exchange. The addresses are on the Interfaces tab.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('MCP bearer token'),
            description: null,
            value: mcpToken,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('File exchange user name'),
            description: null,
            value: filesUsername,
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('File exchange password'),
            description: null,
            value: filesPassword,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
        ],
      },
    }
  },
)
