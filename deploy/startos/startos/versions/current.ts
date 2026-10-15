import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.9.0:0',
  releaseNotes: {
    en_US:
      'First StartOS package: browser editor, file exchange and MCP endpoint for AI agents.',
    es_ES:
      'Primer paquete para StartOS: editor en el navegador, intercambio de archivos y punto de acceso MCP para agentes de IA.',
    de_DE:
      'Erstes StartOS-Paket: Browser-Editor, Dateiaustausch und MCP-Endpunkt für KI-Agenten.',
    pl_PL:
      'Pierwszy pakiet StartOS: edytor w przeglądarce, wymiana plików i punkt końcowy MCP dla agentów AI.',
    fr_FR:
      "Premier paquet StartOS : éditeur dans le navigateur, échange de fichiers et point d'accès MCP pour les agents IA.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
