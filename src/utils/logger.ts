const LOG_LEVELS = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 } as const

type LogLevel = keyof typeof LOG_LEVELS

const currentLevel: LogLevel =
  (typeof window !== 'undefined' && (localStorage.getItem('log_level') as LogLevel)) ||
  (import.meta.env.DEV ? 'debug' : 'info')

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function prefix(level: LogLevel, name: string): string {
  const ts = new Date().toISOString().slice(11, 23)
  return `[${ts}] [${level.toUpperCase()}] [${name}]`
}

export function createLogger(name: string) {
  return {
    trace: (...args: unknown[]) => {
      if (shouldLog('trace')) console.debug(prefix('trace', name), ...args)
    },
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) console.debug(prefix('debug', name), ...args)
    },
    info: (...args: unknown[]) => {
      if (shouldLog('info')) console.info(prefix('info', name), ...args)
    },
    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) console.warn(prefix('warn', name), ...args)
    },
    error: (...args: unknown[]) => {
      if (shouldLog('error')) console.error(prefix('error', name), ...args)
    },
  }
}
