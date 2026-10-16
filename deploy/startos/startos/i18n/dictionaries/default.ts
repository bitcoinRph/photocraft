export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting PhotoCraft!': 0,
  Editor: 1,
  'The editor is ready': 2,
  'The editor is not ready': 3,
  'MCP Endpoint': 4,
  'The MCP endpoint is ready': 5,
  'The MCP endpoint is not ready': 6,

  // interfaces.ts
  'PhotoCraft in your browser': 7,
  'File Exchange': 8,
  'The workspace directory: browse and download in a browser, upload with HTTP PUT': 9,
  'Streamable HTTP MCP server for AI agents (send the bearer token)': 10,

  // actions/setAgentCredentials.ts
  'Set Agent Credentials': 11,
  'Generate the bearer token for the MCP endpoint and the password for the file exchange. Replaces any existing credentials.': 12,
  'This replaces the current token and password. Every connected agent must be given the new ones.': 13,
  'Agent Credentials': 14,
  'Give the MCP token to each agent as `Authorization: Bearer <token>`. Use the user name and password for the file exchange. The addresses are on the Interfaces tab.': 15,
  'MCP bearer token': 16,
  'File exchange user name': 17,
  'File exchange password': 18,

  // init/watchCredentials.ts
  'Generate the MCP token and the file exchange password before agents can connect': 19,
  'Use only English letters and digits.': 20,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
