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

const CLI_VERSION = "1.0.0";

function formatModelsForHelp() {
  const orderedModels = [
    DEFAULT_MODEL,
    ...TTS_MODELS.filter((model) => model !== DEFAULT_MODEL),
  ];

  const maxModelLength = Math.max(...orderedModels.map((model) => model.length));

  return orderedModels.map(
    (model) => {
      const paddedModel = model.padEnd(maxModelLength);

      return `${COLOR_MODEL(paddedModel)} ${COLOR_META(`(${MODEL_DESCRIPTIONS[model]})`)}${
        model === DEFAULT_MODEL ? ` ${COLOR_GOOD("[default]")}` : ""
      }`;
    },
  ).join("\n  ");
}

function formatPlayersForHelp() {
  const maxPlayerLength = Math.max(...PLAYER_NAMES.map((name) => name.length));

  return PLAYER_NAMES.map((name) => {
    const definition = PLAYER_DEFINITIONS[name];
    const paddedName = name.padEnd(maxPlayerLength);
    return `${COLOR_MODEL(paddedName)} ${COLOR_META(`(${definition.description})`)}`;
  }).join("\n  ");
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
    .option("-k, --api-key <apiKey>", "ElevenLabs API key override")
    .option("-i, --voice <voiceId>", `ElevenLabs voice ID (default: ${DEFAULT_VOICE_ID})`)
    .option("-v, --version", "Display version number")
    .option("-r, --report", "Show playback report")
    .option("--verbose", "Alias for --report")
    .help((sections) => {
      return [
        ...sections,
        {
          title: COLOR_HEADING("Available models"),
          body: `  ${formatModelsForHelp()}`,
        },
        {
          title: COLOR_HEADING("Supported players"),
          body: `  ${formatPlayersForHelp()}`,
        },
      ];
    });

  cli
    .command("[...text]", "text to speak")
    .example('yap "You are absolutelly right!"')
    .example("yap you are absolultely right!")
    .example('yap "fast mode" -m eleven_flash_v2_5')
    .example('yap "use custom key" -k elv_xxx')
    .example('yap "use custom key" --api-key elv_xxx')
    .example('yap "custom voice" -i JBFqnCBsd6RMkjVDRZzb')
    .example('yap "force player" -p ffplay')
    .example('yap "test" --report')
    .example("yap --version")
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
      const key = options.apiKey ? String(options.apiKey) : undefined;
      const report = Boolean(options.report || options.verbose);

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

      if (report) {
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
    const parsed = cli.parse(argv, { run: false });
    if (parsed.options.help || parsed.options.version) {
      if (parsed.options.version) {
        console.log(`yap/${CLI_VERSION}`);
      }
      return;
    }

    await cli.runMatchedCommand();
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      process.exit(1);
    }

    throw error;
  }
}
