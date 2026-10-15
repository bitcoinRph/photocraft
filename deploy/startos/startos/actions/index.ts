import { sdk } from '../sdk'
import { setAgentCredentials } from './setAgentCredentials'

export const actions = sdk.Actions.of().addAction(setAgentCredentials)
