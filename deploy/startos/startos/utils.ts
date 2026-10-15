// Ports the two containers listen on. StartOS binds each one in interfaces.ts
// and main.ts health-checks them.
export const uiPort = 8080
export const filesPort = 8081
export const mcpPort = 8082

// The user name the OS reverse proxy accepts for the file exchange (basic auth).
export const filesUsername = 'photocraft'

// The one directory PhotoCraft may read and write (its automation roots), and
// the directory the file exchange serves. Both containers mount the `main`
// volume at /data, so this is the same directory seen from either side.
export const workspaceDir = '/data/workspace'
