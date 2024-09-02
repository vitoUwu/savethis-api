export default {
  log: (...args: unknown[]) => {
    console.log("[LOG]", ...args);
  },
  info: (...args: unknown[]) => {
    console.info(green("[INFO]"), ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(orange("[WARN]"), ...args);
  },
  error: (...args: unknown[]) => {
    console.error(red("[ERROR]"), ...args);
  }
};

export function red(message: string) {
  return `\x1b[31m${message}\x1b[0m`;
}

export function orange(message: string) {
  return `\x1b[33m${message}\x1b[0m`;
}

export function green(message: string) {
  return `\x1b[32m${message}\x1b[0m`;
}
