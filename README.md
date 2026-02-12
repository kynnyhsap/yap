# yap

cli to yap in the terminal

kind of like `say` cli in macos, but using elevenlabs tts model

Set your API key before running:

```bash
export ELEVENLABS_API_KEY=your_api_key_here
```

## Usage

```bash
yap "You are absolutelly right!"
yap you are absolultely right!
yap "low-latency speech" -m eleven_flash_v2_5
yap "high-quality speech" -m eleven_multilingual_v2
yap "use custom key" --api-key elv_xxx
yap "use custom voice" -i JBFqnCBsd6RMkjVDRZzb
yap "force a specific player" -p ffplay
yap "use custom key" -k elv_xxx
yap --version
yap --players
yap --verbose "show playback report"
yap --help
```

Default model: `eleven_turbo_v2_5`

Default player selection order: `mpv` -> `ffplay` -> `cvlc` -> `mplayer` -> `mpg123`

Supported players:

- `mpv` (recommended)
- `ffplay` (fallback)
- `cvlc` (vlc)
- `mplayer` (legacy)
- `mpg123` (lightweight)

`--verbose` prints a playback report with model, voice, player, latency, total time, text length, estimated cost (credits), and bytes streamed.

Version: `yap@1.0.0` (`-v` / `--version`)

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
