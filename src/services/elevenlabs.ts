import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

import type { TtsModel } from '../config/models'
import type { Logger } from '../logging'

const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'

const clients = new Map<string, ElevenLabsClient>()

function getClient(customApiKey?: string) {
  const apiKey = customApiKey ?? process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('Missing API key. Set ELEVENLABS_API_KEY or pass --key <apiKey>')
  }

  const existingClient = clients.get(apiKey)
  if (existingClient) {
    return existingClient
  }

  const client = new ElevenLabsClient({ apiKey })
  clients.set(apiKey, client)
  return client
}

export async function ttsStream(options: {
  text: string
  model: TtsModel
  customApiKey?: string
  voiceId?: string
  logger: Logger
}) {
  const { text, model, customApiKey, voiceId = DEFAULT_VOICE_ID, logger } = options

  const request = {
    modelId: model,
    text,
    ...(model === 'eleven_v3' ? {} : { optimizeStreamingLatency: 1 }),
  }

  logger.debug(
    `request: model=${model} voice=${voiceId} text_length=${text.length} optimize_latency=${model === 'eleven_v3' ? 'off' : 'on'}`,
  )

  const response = getClient(customApiKey).textToSpeech.stream(voiceId, request)
  const { data, rawResponse } = await response.withRawResponse()

  logger.debug(
    `response: status=${rawResponse.status} concurrent=${rawResponse.headers.get('current-concurrent-requests') ?? 'n/a'}/${rawResponse.headers.get('maximum-concurrent-requests') ?? 'n/a'}`,
  )

  return {
    stream: data,
    headers: rawResponse.headers,
  }
}

export { DEFAULT_VOICE_ID }
