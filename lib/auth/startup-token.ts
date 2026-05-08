// Generated once per server process. Survives HMR re-evaluation (dev) but
// resets on a true server restart, forcing users to log in again.
const g = globalThis as typeof globalThis & { __srvStartupToken?: string }
if (!g.__srvStartupToken) {
  g.__srvStartupToken = crypto.randomUUID()
}
export const STARTUP_TOKEN = g.__srvStartupToken
