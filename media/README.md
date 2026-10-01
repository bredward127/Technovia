# Video

Drop your edits here — the site picks them up automatically, no code changes.

| File | Where it plays | Spec |
| --- | --- | --- |
| `hero.mp4` | Replaces the hero slideshow (muted, looping, autoplay) | 4:5 portrait, 10–20s, no audio, H.264, under ~8 MB |
| `film.mp4` | "The film" section, plays with sound when the visitor taps Play | 16:9 (desktop crop) — keep key action centred for the 4:5 mobile crop, H.264 + AAC |

Compress with: `ffmpeg -i in.mov -vcodec libx264 -crf 24 -preset slow -movflags +faststart -an hero.mp4`
(drop `-an` for the film so audio is kept).
