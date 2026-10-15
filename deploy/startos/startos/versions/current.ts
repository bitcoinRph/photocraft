import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.9.0:1',
  releaseNotes: {
    en_US:
      'Require authentication inside the package, ship web fonts, create inbox/out directories and strengthen runtime checks.',
    es_ES:
      'Requiere autenticación dentro del paquete, incluye fuentes web, crea los directorios inbox/out y mejora las comprobaciones.',
    de_DE:
      'Erfordert Authentifizierung im Paket, liefert Web-Schriften, erstellt inbox/out und verbessert Laufzeitprüfungen.',
    pl_PL:
      'Wymaga uwierzytelniania w pakiecie, zawiera fonty webowe, tworzy inbox/out i wzmacnia kontrole działania.',
    fr_FR:
      "Impose l'authentification dans le paquet, fournit les polices web, crée inbox/out et renforce les contrôles d'exécution.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
