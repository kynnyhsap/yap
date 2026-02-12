import { Command, CommanderError, Option } from "commander";
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
  ).join("\n  ");
}

function formatPlayersForHelp() {
  return PLAYER_NAMES.map((name) => {
    const definition = PLAYER_DEFINITIONS[name];
    return `${COLOR_MODEL(name)} ${COLOR_META(`(${definition.description})`)}`;
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
  const program = new Command()
    .name("yap")
    .description("CLI to yap in the terminal with ElevenLabs TTS")
    .configureOutput({
      writeOut: (str) => {
        process.stdout.write(colorizeHelp(str));
      },
      writeErr: (str) => {
        process.stderr.write(colorizeHelp(str));
      },
    })
    .configureHelp({
      sortOptions: true,
    })
    .addOption(
      new Option("-m, --model <model>", "TTS model to use").default(DEFAULT_MODEL),
    )
    .addOption(
      new Option("-p, --player <player>", "Audio player backend").choices([
        ...PLAYER_NAMES,
      ]),
    )
    .option("--players", "List players available on this system")
    .option("-k, --key <apiKey>", "ElevenLabs API key override")
    .option("-v, --voice <voiceId>", "ElevenLabs voice ID", DEFAULT_VOICE_ID)
    .option("--verbose", "Show playback and latency details")
    .argument("[text...]", "text to speak")
    .addHelpText(
      "after",
      `\n${COLOR_HEADING("Examples")}:\n  ${COLOR_COMMAND('yap "nah it\'s GGs"')}\n  ${COLOR_COMMAND('yap -m eleven_flash_v2_5 "fast mode"')}\n  ${COLOR_COMMAND('yap -k elv_xxx "use custom key"')}\n  ${COLOR_COMMAND('yap -v JBFqnCBsd6RMkjVDRZzb "custom voice"')}\n  ${COLOR_COMMAND('yap -p ffplay "force player"')}\n  ${COLOR_COMMAND("yap --players")}\n\n${COLOR_HEADING("Available models")}:\n  ${formatModelsForHelp()}\n\n${COLOR_HEADING("Supported players")}:\n  ${formatPlayersForHelp()}`,
    )
    .showHelpAfterError('(add "--help" for usage)')
    .action(
      async (
        text: string[],
        options: {
          model: string;
          key?: string;
          voice: string;
          verbose?: boolean;
          players?: boolean;
          player?: string;
        },
      ) => {
        if (options.players) {
          printPlayers();
          return;
        }

        if (!text || text.length === 0) {
          throw new Error("No text provided. Pass text or run --players.");
        }

        if (!isTtsModel(options.model)) {
          throw new Error(
            `Unsupported model: ${options.model}. Run --help to see available models.`,
          );
        }

        const startedAt = performance.now();
        const joinedText = text.join(" ").trim();

        const { stream, headers } = await ttsStream({
          text: joinedText,
          model: options.model as TtsModel,
          customApiKey: options.key,
          voiceId: options.voice,
        });

        const result = await playAudioStream(stream, {
          player: options.player,
          startedAt,
        });

        if (options.verbose) {
          const ttfb = result.ttfbMs === undefined ? "n/a" : `${result.ttfbMs.toFixed(1)}ms`;
          printVerboseReport({
            model: options.model,
            voice: options.voice,
            player: result.player,
            latency: ttfb,
            total: `${result.totalMs.toFixed(1)}ms`,
            bytes: result.bytes,
            textLength: joinedText.length,
            cost: extractCost(headers),
          });
        }
      },
    );

  program.exitOverride();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exit(error.exitCode);
    }

    if (error instanceof Error) {
      console.error(error.message);
      process.exit(1);
    }

    throw error;
  }
}
