import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

// The two credentials the OS reverse proxy checks (interfaces.ts). The proxy
// needs them in the clear, so they live on the `startos` volume, which no
// container mounts. The set-agent-credentials action is the only writer.
const shape = z.looseObject({
  mcpToken: z.string().optional().catch(undefined),
  filesPassword: z.string().optional().catch(undefined),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
