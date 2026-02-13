import { COLOR_META } from "./help/colors";

export type Logger = {
  debug: (message: string) => void;
};

const NOOP_LOGGER: Logger = {
  debug: () => {},
};

export function createLogger(enabled: boolean): Logger {
  if (!enabled) {
    return NOOP_LOGGER;
  }

  return {
    debug: (message: string) => {
      console.log(`${COLOR_META("[debug]")} ${message}`);
    },
  };
}
