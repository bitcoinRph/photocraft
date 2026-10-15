import { sdk } from './sdk'

// `main` is the workspace; `startos` holds the proxy credentials. Restoring
// one without the other would bring back photos no agent can reach.
export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) => sdk.Backups.ofVolumes('main', 'startos'),
)
