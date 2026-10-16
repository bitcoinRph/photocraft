import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const mcpTokenGenerator = {
  charset: 'a-z,A-Z,0-9' as const,
  len: 64,
}
const filesPasswordGenerator = {
  charset: 'a-z,A-Z,0-9' as const,
  len: 32,
}

const inputSpec = sdk.InputSpec.of({
  mcpToken: sdk.Value.text({
    name: i18n('MCP bearer token'),
    description: null,
    required: true,
    default: mcpTokenGenerator,
    generate: mcpTokenGenerator,
    masked: true,
    minLength: 64,
    maxLength: 64,
    patterns: [
      {
        regex: '^[A-Za-z0-9]+$',
        description: i18n('Use only English letters and digits.'),
      },
    ],
  }),
  filesPassword: sdk.Value.text({
    name: i18n('File exchange password'),
    description: null,
    required: true,
    default: filesPasswordGenerator,
    generate: filesPasswordGenerator,
    masked: true,
    minLength: 32,
    maxLength: 32,
    patterns: [
      {
        regex: '^[A-Za-z0-9]+$',
        description: i18n('Use only English letters and digits.'),
      },
    ],
  }),
})

export const setAgentCredentials = sdk.Action.withInput(
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

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    await storeJson.merge(effects, {
      mcpToken: input.mcpToken,
      filesPassword: input.filesPassword,
    })
  },
)
