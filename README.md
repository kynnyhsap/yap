# yap

cli to yap in the terminal

kind of like `say` cli in macos, but using elevenlabs tts model

Set your API key before running:

```bash
export ELEVENLABS_API_KEY=your_api_key_here
```

## Usage

```bash
yap "i am tired boss"
yap i am tired boss
yap "low-latency speech" -m eleven_flash_v2_5
yap "high-quality speech" -m eleven_multilingual_v2
yap "use custom key" --api-key elv_xxx
yap "use custom voice" -i JBFqnCBsd6RMkjVDRZzb
yap "force a specific player" -p ffplay
yap "use custom key" -k elv_xxx
yap "test" --report
yap "test" --debug
echo "test" | yap
yap --version
yap --players
yap --report "show playback report"
yap --help
bun lint
bun typecheck
bun format
```

Default model: `eleven_turbo_v2_5`

Default player selection order: `mpv` -> `ffplay` -> `cvlc` -> `mplayer` -> `mpg123`

Supported players:

- `mpv` (recommended)
- `ffplay` (fallback)
- `cvlc` (vlc)
- `mplayer` (legacy)
- `mpg123` (lightweight)

`--report` prints a playback report with model, voice, player, TTFB, total time, text length, estimated cost (credits), and bytes streamed (`--verbose` is supported as an alias).

`--debug` prints request and streaming diagnostics (selected player, request info, first chunk timing, and stream completion stats).

Version: `yap@1.0.0` (`-v` / `--version`)

Supported TTS models:

- `eleven_v3` (expressive)
- `eleven_multilingual_v2` (high quality)
- `eleven_flash_v2_5` (ultra fast)
- `eleven_flash_v2` (fast)
- `eleven_turbo_v2_5` (fastest) **default**
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
