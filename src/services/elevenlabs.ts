import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { TtsModel } from "../config/models";

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

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

export async function ttsStream(options: {
  text: string;
  model: TtsModel;
  customApiKey?: string;
  voiceId?: string;
}) {
  const { text, model, customApiKey, voiceId = DEFAULT_VOICE_ID } = options;

  const request = {
    modelId: model,
    text,
    ...(model === "eleven_v3" ? {} : { optimizeStreamingLatency: 1 }),
  };

  const response = getClient(customApiKey).textToSpeech.stream(voiceId, request);
  const { data, rawResponse } = await response.withRawResponse();

  return {
    stream: data,
    headers: rawResponse.headers,
  };
}

export { DEFAULT_VOICE_ID };
