# yap

cli to yap in the terminal

kind of like `say` cli in macos, but using elevenlabs tts model

Set your API key before running:

```bash
export ELEVENLABS_API_KEY=your_api_key_here
```

## Usage

```bash
yap "hello from yap"
yap --model eleven_flash_v2_5 "low-latency speech"
yap -m eleven_multilingual_v2 "high-quality speech"
yap -k elv_xxx "use custom key"
yap -v JBFqnCBsd6RMkjVDRZzb "use custom voice"
yap --help
```

Default model: `eleven_turbo_v2_5`

Supported TTS models:

- `eleven_v3` (expressive)
- `eleven_multilingual_v2` (high quality)
- `eleven_flash_v2_5` (ultra fast)
- `eleven_flash_v2` (fast)
- `eleven_turbo_v2_5` (fastest)
- `eleven_turbo_v2` (balanced)

## Benchmark snapshot

Phrase: `nah it's GGs`

- `eleven_turbo_v2_5`: `321.0ms` (fastest)
- `eleven_turbo_v2`: `348.2ms`
- `eleven_flash_v2_5`: `417.3ms`
- `eleven_flash_v2`: `522.6ms`
- `eleven_multilingual_v2`: `817.7ms`
- `eleven_v3`: `1254.7ms`

Notes:

- Results depend on your account tier, region, and network conditions.
