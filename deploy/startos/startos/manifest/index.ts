import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'photocraft',
  title: 'PhotoCraft',
  license: 'MIT OR Apache-2.0',
  packageRepo: 'https://github.com/bitcoinRph/photocraft',
  upstreamRepo: 'https://github.com/storytold/photocraft',
  marketingUrl: 'https://getartcraft.com/apps/photocraft',
  donationUrl: null,
  description: { short, long },
  // `main` holds the workspace (the photos). `startos` holds store.json with
  // the proxy credentials; no container mounts it.
  volumes: ['main', 'startos'],
  // Both images build from this repository's source (the build context is the
  // repository root, two levels up). See deploy/startos/*.Dockerfile.
  images: {
    web: {
      source: {
        dockerBuild: {
          workdir: '../..',
          dockerfile: '../../deploy/startos/web.Dockerfile',
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
    agent: {
      source: {
        dockerBuild: {
          workdir: '../..',
          dockerfile: '../../deploy/startos/agent.Dockerfile',
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
