const ELEVEN_LABS_API_URI = "https://api.elevenlabs.io/v1";

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";
const model_id = "eleven_turbo_v2";

export async function tts(text: string) {
  const response = await fetch(
    `${ELEVEN_LABS_API_URI}/text-to-speech/${DEFAULT_VOICE_ID}/stream?optimize_streaming_latency=1`,
    {
      method: "POST",

      headers: {
        "Xi-Api-Key": ELEVEN_LABS_API_KEY,
      },

      body: JSON.stringify({
        model_id,
        text,
      }),
    },
  );

  if (!response.body) {
    throw new Error("Response body is null");
  }

  return response.body;
}
