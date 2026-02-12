import { spawn } from "bun";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Command, CommanderError, Option } from "commander";
import pc from "picocolors";

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

const MODEL_DESCRIPTIONS = {
  eleven_v3: "expressive",
  eleven_multilingual_v2: "high quality",
  eleven_flash_v2_5: "ultra fast",
  eleven_flash_v2: "fast",
  eleven_turbo_v2_5: "fastest",
  eleven_turbo_v2: "balanced",
} as const;

type TtsModel = keyof typeof MODEL_DESCRIPTIONS;
const TTS_MODELS = Object.keys(MODEL_DESCRIPTIONS) as TtsModel[];
const DEFAULT_MODEL: TtsModel = "eleven_turbo_v2_5";
const COLOR_HEADING = (text: string) => pc.bold(pc.cyan(text));
const COLOR_COMMAND = (text: string) => pc.green(text);
const COLOR_MODEL = (text: string) => pc.yellow(text);
const COLOR_SECTION = (text: string) => pc.bold(pc.magenta(text));
const COLOR_TERM = (text: string) => pc.bold(pc.cyan(text));
const COLOR_META = (text: string) => pc.dim(text);

type Player = {
  name: "mpv" | "ffplay";
  args: string[];
};

function selectPlayer(): Player {
  if (Bun.which("mpv")) {
    return { name: "mpv", args: ["-"] };
  }

  if (Bun.which("ffplay")) {
    return { name: "ffplay", args: ["-autoexit", "-nodisp", "-"] };
  }

  throw new Error(
    "No supported audio player found. Install mpv (recommended) or ffplay.",
  );
}

function colorizeHelp(output: string) {
  return output
    .replace(/^Usage:/gm, COLOR_SECTION("Usage:"))
    .replace(/^Arguments:/gm, COLOR_SECTION("Arguments:"))
    .replace(/^Options:/gm, COLOR_SECTION("Options:"))
    .replace(/^\s{2}(-[^\s,]+,[ \t]+--[^\s]+[ \t]*(?:<[^>]+>)?)/gm, (_, term: string) => {
      return `  ${COLOR_TERM(term)}`;
    })
    .replace(/^\s{2}([a-zA-Z][^\s]*)[ \t]{2,}/gm, (_, term: string) => {
      if (term === "Examples:" || term === "Available") {
        return `  ${term}  `;
      }

      return `  ${COLOR_TERM(term)}  `;
    })
    .replace(/\((default:[^)]+)\)/g, (_, text: string) => `(${COLOR_META(text)})`)
    .replace(/\((choices:[^)]+)\)/g, (_, text: string) => `(${COLOR_META(text)})`);
}

const clients = new Map<string, ElevenLabsClient>();

function getClient(customApiKey?: string) {
  const apiKey = customApiKey ?? process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key. Set ELEVENLABS_API_KEY or pass --key <apiKey>",
    );
  }

  const existingClient = clients.get(apiKey);
  if (existingClient) {
    return existingClient;
  }

  const client = new ElevenLabsClient({ apiKey });
  clients.set(apiKey, client);
  return client;
}

async function tts(
  text: string,
  model: TtsModel = DEFAULT_MODEL,
  customApiKey?: string,
  voiceId: string = DEFAULT_VOICE_ID,
) {
  const request = {
    modelId: model,
    text,
    ...(model === "eleven_v3" ? {} : { optimizeStreamingLatency: 1 }),
  };

  return getClient(customApiKey).textToSpeech.stream(voiceId, request);
}

async function speak(
  prompt: string,
  model: TtsModel,
  customApiKey?: string,
  voiceId: string = DEFAULT_VOICE_ID,
  verbose = false,
) {
  const player = selectPlayer();
  const startedAt = performance.now();
  const stream = await tts(prompt, model, customApiKey, voiceId);

  const playerProcess = spawn([player.name, ...player.args], {
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

  if (verbose) {
    const totalMs = performance.now() - startedAt;
    const ttfb = ttfbMs === undefined ? "n/a" : `${ttfbMs.toFixed(1)}ms`;

    console.log(
      `${COLOR_HEADING("yap")}: model=${COLOR_MODEL(model)} voice=${COLOR_MODEL(voiceId)} player=${COLOR_MODEL(player.name)} latency=${COLOR_MODEL(ttfb)} total=${COLOR_MODEL(`${totalMs.toFixed(1)}ms`)} bytes=${COLOR_MODEL(String(bytes))}`,
    );
  }
}

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
  .option("-k, --key <apiKey>", "ElevenLabs API key override")
  .option("-v, --voice <voiceId>", "ElevenLabs voice ID", DEFAULT_VOICE_ID)
  .option("--verbose", "Show playback and latency details")
  .argument("<text...>", "text to speak")
  .addHelpText(
    "after",
    `\n${COLOR_HEADING("Examples")}:\n  ${COLOR_COMMAND('yap "nah it\'s GGs"')}\n  ${COLOR_COMMAND('yap -m eleven_flash_v2_5 "fast mode"')}\n  ${COLOR_COMMAND('yap -k elv_xxx "use custom key"')}\n  ${COLOR_COMMAND('yap -v JBFqnCBsd6RMkjVDRZzb "custom voice"')}\n  ${COLOR_COMMAND('yap --verbose "show timing"')}\n\n${COLOR_HEADING("Available models")}:\n  ${TTS_MODELS.map((model) => `${COLOR_MODEL(model)} ${COLOR_META(`(${MODEL_DESCRIPTIONS[model]})`)}`).join("\n  ")}`,
  )
  .showHelpAfterError('(add "--help" for usage)')
  .action(
    async (
      text: string[],
      options: { model: TtsModel; key?: string; voice: string; verbose?: boolean },
    ) => {
      if (!TTS_MODELS.includes(options.model)) {
        throw new Error(
          `Unsupported model: ${options.model}. Run --help to see available models.`,
        );
      }

      await speak(
        text.join(" ").trim(),
        options.model,
        options.key,
        options.voice,
        Boolean(options.verbose),
      );
    },
  );

program.exitOverride();

try {
  await program.parseAsync(Bun.argv);
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
