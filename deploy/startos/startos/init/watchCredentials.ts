import { setAgentCredentials } from '../actions/setAgentCredentials'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

// The MCP endpoint and the file exchange are not exported until both
// credentials exist (interfaces.ts), so the task is critical.
export const watchCredentials = sdk.setupOnInit(async (effects) => {
  const store = await storeJson.read().const(effects)

  if (!store?.mcpToken || !store?.filesPassword) {
    await sdk.action.createOwnTask(effects, setAgentCredentials, 'critical', {
      reason: i18n(
        'Generate the MCP token and the file exchange password before agents can connect',
      ),
    })
  }
})
