export const MODEL_DESCRIPTIONS = {
  eleven_v3: "expressive",
  eleven_multilingual_v2: "high quality",
  eleven_flash_v2_5: "ultra fast",
  eleven_flash_v2: "fast",
  eleven_turbo_v2_5: "fastest",
  eleven_turbo_v2: "balanced",
} as const;

export type TtsModel = keyof typeof MODEL_DESCRIPTIONS;

export const TTS_MODELS = Object.keys(MODEL_DESCRIPTIONS) as TtsModel[];

export const DEFAULT_MODEL: TtsModel = "eleven_turbo_v2_5";

export function isTtsModel(model: string): model is TtsModel {
  return model in MODEL_DESCRIPTIONS;
}
