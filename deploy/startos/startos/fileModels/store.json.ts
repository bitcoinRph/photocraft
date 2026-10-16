import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

// The two credentials checked both by the OS reverse proxy and by listeners
// inside the package. They live on the `startos` volume, which no container
// mounts; main.ts writes only the needed credential into each ephemeral rootfs.
const shape = z.looseObject({
  mcpToken: z.string().optional().catch(undefined),
  filesPassword: z.string().optional().catch(undefined),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
