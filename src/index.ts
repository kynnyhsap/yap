import { spawn } from "bun";
import { tts } from "./elevenlabs";

const prompt = Bun.argv.slice(2).join(" ");

const stream = await tts(prompt);

const mpv = spawn(["mpv", "-"], {
  stdin: "pipe",
  stderr: "ignore",
});

for await (const chunk of stream) {
  mpv.stdin.write(chunk);
  await mpv.stdin.flush();
}

await mpv.stdin.end();
