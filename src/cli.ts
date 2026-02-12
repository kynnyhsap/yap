import { goke } from "goke";
import {
  COLOR_BAD,
  COLOR_COMMAND,
  COLOR_GOOD,
  COLOR_HEADING,
  COLOR_META,
  COLOR_MODEL,
  colorizeHelp,
} from "./help/colors";
import {
  DEFAULT_MODEL,
  isTtsModel,
  MODEL_DESCRIPTIONS,
  TTS_MODELS,
  type TtsModel,
} from "./config/models";
import { DEFAULT_VOICE_ID, ttsStream } from "./services/elevenlabs";
import {
  getAvailablePlayers,
  PLAYER_DEFINITIONS,
  PLAYER_NAMES,
  playAudioStream,
} from "./players";

function formatModelsForHelp() {
  return TTS_MODELS.map(
    (model) => `${COLOR_MODEL(model)} ${COLOR_META(`(${MODEL_DESCRIPTIONS[model]})`)}`,
  ).join("\n");
}

function formatPlayersForHelp() {
  return PLAYER_NAMES.map((name) => {
    const definition = PLAYER_DEFINITIONS[name];
    return `${COLOR_MODEL(name)} ${COLOR_META(`(${definition.description})`)}`;
  }).join("\n");
}

function printPlayers() {
  const availablePlayers = getAvailablePlayers();
  console.log(COLOR_HEADING("Players on your system"));

  for (const player of availablePlayers) {
    const status = player.installed ? COLOR_GOOD("installed") : COLOR_BAD("missing");
    console.log(
      `  ${COLOR_MODEL(player.name)} ${COLOR_META(`(${player.description})`)} - ${status}`,
    );
  }
}

function printVerboseReport(data: {
  model: TtsModel;
  voice: string;
  player: string;
  latency: string;
  total: string;
  bytes: number;
  textLength: number;
  cost: string;
}) {
  const label = (text: string) => COLOR_META(text.padEnd(8));

  console.log("");
  console.log(`${COLOR_HEADING("yap")} ${COLOR_META("playback report")}`);
  console.log(`  ${label("model")} ${COLOR_MODEL(data.model)} ${COLOR_META(`(${MODEL_DESCRIPTIONS[data.model]})`)}`);
  console.log(`  ${label("voice")} ${COLOR_MODEL(data.voice)}`);
  console.log(`  ${label("player")} ${COLOR_MODEL(data.player)}`);
  console.log(`  ${label("latency")} ${COLOR_MODEL(data.latency)}`);
  console.log(`  ${label("total")} ${COLOR_MODEL(data.total)}`);
  console.log(`  ${label("length")} ${COLOR_MODEL(String(data.textLength))}`);
  console.log(`  ${label("cost")} ${COLOR_MODEL(data.cost)}`);
  console.log(`  ${label("bytes")} ${COLOR_MODEL(String(data.bytes))}`);
}

function getHeader(headers: Headers, keys: string[]) {
  for (const key of keys) {
    const value = headers.get(key);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function extractCost(headers: Headers) {
  const rawCost = getHeader(headers, [
    "character-cost",
    "x-character-cost",
    "character_cost",
    "x-character_cost",
    "credits-used",
    "x-credits-used",
  ]);

  const rawCurrency = getHeader(headers, [
    "cost-currency",
    "x-cost-currency",
    "character-cost-currency",
    "x-character-cost-currency",
    "currency",
    "x-currency",
  ]);

  if (!rawCost) {
    return "n/a";
  }

  if (rawCurrency) {
    const currency = rawCurrency.trim().toUpperCase();
    if (currency === "USD") {
      return `$${rawCost}`;
    }

    return `${rawCost} ${currency}`;
  }

  return `${rawCost} credits`;
}

export async function runCli(argv: string[]) {
  const cli = goke("yap", {
    stdout: {
      write(data) {
        process.stdout.write(colorizeHelp(data));
      },
    },
    stderr: {
      write(data) {
        process.stderr.write(colorizeHelp(data));
      },
    },
  });

  cli
    .option("-m, --model <model>", `TTS model to use (default: ${DEFAULT_MODEL})`)
    .option("-p, --player <player>", `Audio player backend (${PLAYER_NAMES.join(", ")})`)
    .option("--players", "List players available on this system")
    .option("-k, --key <apiKey>", "ElevenLabs API key override")
    .option("-v, --voice <voiceId>", `ElevenLabs voice ID (default: ${DEFAULT_VOICE_ID})`)
    .option("--verbose", "Show playback and latency details")
    .help((sections) => {
      return [
        ...sections,
        {
          title: COLOR_HEADING("Available models"),
          body: formatModelsForHelp(),
        },
        {
          title: COLOR_HEADING("Supported players"),
          body: formatPlayersForHelp(),
        },
      ];
    });

  cli
    .command("[...text]", "text to speak")
    .example('yap "nah it\'s GGs"')
    .example('yap -m eleven_flash_v2_5 "fast mode"')
    .example('yap -k elv_xxx "use custom key"')
    .example('yap -v JBFqnCBsd6RMkjVDRZzb "custom voice"')
    .example('yap -p ffplay "force player"')
    .example("yap --players")
    .action(async (text: string[] = [], options: Record<string, unknown>) => {
      if (options.players) {
        printPlayers();
        return;
      }

      if (!text || text.length === 0) {
        throw new Error("No text provided. Pass text or run --players.");
      }

      const model = String(options.model ?? DEFAULT_MODEL);
      if (!isTtsModel(model)) {
        throw new Error(`Unsupported model: ${model}. Run --help to see available models.`);
      }

      const player = options.player ? String(options.player) : undefined;
      if (player && !PLAYER_NAMES.includes(player as (typeof PLAYER_NAMES)[number])) {
        throw new Error(
          `Unsupported player: ${player}. Run --players to see supported players.`,
        );
      }

      const voice = String(options.voice ?? DEFAULT_VOICE_ID);
      const key = options.key ? String(options.key) : undefined;
      const verbose = Boolean(options.verbose);

      const startedAt = performance.now();
      const joinedText = text.join(" ").trim();

      const { stream, headers } = await ttsStream({
        text: joinedText,
        model,
        customApiKey: key,
        voiceId: voice,
      });

      const result = await playAudioStream(stream, {
        player,
        startedAt,
      });

      if (verbose) {
        const ttfb = result.ttfbMs === undefined ? "n/a" : `${result.ttfbMs.toFixed(1)}ms`;
        printVerboseReport({
          model,
          voice,
          player: result.player,
          latency: ttfb,
          total: `${result.totalMs.toFixed(1)}ms`,
          bytes: result.bytes,
          textLength: joinedText.length,
          cost: extractCost(headers),
        });
      }
    });

  try {
    cli.parse(argv, { run: false });
    await cli.runMatchedCommand();
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      process.exit(1);
    }

    throw error;
  }
}
