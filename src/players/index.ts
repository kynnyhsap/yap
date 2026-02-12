import { spawn } from "bun";

export interface PlayerAdapter {
  description: string;
  command: string;
  args: readonly string[];
}

export const PLAYER_DEFINITIONS = {
  mpv: {
    description: "recommended",
    command: "mpv",
    args: ["-"],
  },
  ffplay: {
    description: "fallback",
    command: "ffplay",
    args: ["-autoexit", "-nodisp", "-"],
  },
  cvlc: {
    description: "vlc",
    command: "cvlc",
    args: ["--play-and-exit", "-"],
  },
  mplayer: {
    description: "legacy",
    command: "mplayer",
    args: ["-"],
  },
  mpg123: {
    description: "lightweight",
    command: "mpg123",
    args: ["-"],
  },
} as const satisfies Record<string, PlayerAdapter>;

export type PlayerName = keyof typeof PLAYER_DEFINITIONS;

export const PLAYER_NAMES = Object.keys(PLAYER_DEFINITIONS) as PlayerName[];

export type AvailablePlayer = {
  name: PlayerName;
  description: string;
  installed: boolean;
  command: string;
};

export function getAvailablePlayers(): AvailablePlayer[] {
  return PLAYER_NAMES.map((name) => {
    const definition = PLAYER_DEFINITIONS[name];
    return {
      name,
      description: definition.description,
      installed: Boolean(Bun.which(definition.command)),
      command: definition.command,
    };
  });
}

export function resolvePlayer(explicitPlayer?: string) {
  if (explicitPlayer) {
    if (!PLAYER_NAMES.includes(explicitPlayer as PlayerName)) {
      throw new Error(
        `Unsupported player: ${explicitPlayer}. Run --players to see supported players.`,
      );
    }

    const selectedName = explicitPlayer as PlayerName;
    const selectedDefinition = PLAYER_DEFINITIONS[selectedName];
    if (!Bun.which(selectedDefinition.command)) {
      throw new Error(
        `Player ${selectedName} is not installed. Run --players to inspect availability.`,
      );
    }

    return {
      name: selectedName,
      ...selectedDefinition,
    };
  }

  for (const name of PLAYER_NAMES) {
    const definition = PLAYER_DEFINITIONS[name];
    if (Bun.which(definition.command)) {
      return {
        name,
        ...definition,
      };
    }
  }

  throw new Error(
    "No supported audio player found. Install mpv, ffplay, cvlc, mplayer, or mpg123.",
  );
}

export async function playAudioStream(
  stream: ReadableStream<Uint8Array>,
  options?: { player?: string; startedAt?: number },
) {
  const startedAt = options?.startedAt ?? performance.now();
  const player = resolvePlayer(options?.player);
  const playerProcess = spawn([player.command, ...player.args], {
    stdin: "pipe",
    stderr: "ignore",
  });

  let ttfbMs: number | undefined;
  let bytes = 0;

  for await (const chunk of stream) {
    if (ttfbMs === undefined) {
      ttfbMs = performance.now() - startedAt;
    }

    bytes += chunk.byteLength;
    playerProcess.stdin.write(chunk);
    await playerProcess.stdin.flush();
  }

  await playerProcess.stdin.end();
  const exitCode = await playerProcess.exited;
  if (exitCode !== 0) {
    throw new Error(`${player.name} exited with code ${exitCode}`);
  }

  const totalMs = performance.now() - startedAt;

  return {
    player: player.name,
    ttfbMs,
    totalMs,
    bytes,
  };
}
