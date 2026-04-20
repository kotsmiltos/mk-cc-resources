---
name: alert-sounds
description: Configure alert sounds — volume, mute/unmute, custom sounds per event
tools: [Read, Edit, Glob]
---

<objective>
Modify alert-sounds plugin config: adjust volume, mute/unmute, assign custom sounds per event.
</objective>

<context>
Find config:

```
Glob: **/alert-sounds/hooks/config.json
```

Config structure:
```json
{
  "volume": 100,
  "muted": false,
  "stop":       { "beep": true, "sound": null, "notify": false, "flash": true, "statusline": true },
  "permission": { "beep": true, "sound": null, "notify": true,  "flash": true, "statusline": true },
  "idle":       { "beep": true, "sound": null, "notify": true,  "flash": true, "statusline": true }
}
```

Fields:
- `volume` (0-100): Global volume. Default 100. Custom sounds (all platforms) and built-in tones (macOS/Linux). Windows Console::Beep ignores this — uses system volume.
- `muted` (true/false): Suppress all sounds. Visual alerts (notifications, flash, statusline) still fire. Default false.
- Per-event (`stop`, `permission`, `idle`):
  - `sound`: Absolute path to sound file (mp3/wav/ogg/aiff), or `null` for built-in tones
  - `beep`: Play built-in tones when no custom sound set (true/false)
  - `notify`: Desktop notifications (true/false)
  - `flash`: Flash taskbar/dock (true/false)
  - `statusline`: Status line color indicator (true/false)

Events:
- `stop` — Claude finished task
- `permission` — tool needs user approval
- `idle` — Claude waiting for input
</context>

<instructions>
1. Glob `**/alert-sounds/hooks/config.json` to find config
2. Read config
3. Apply requested change:
   - **Volume**: set `"volume"` to value (0-100)
   - **Mute**: set `"muted"` to `true`
   - **Unmute**: set `"muted"` to `false`
   - **Custom sound**: set event's `"sound"` to file path
   - **Reset sound**: set event's `"sound"` to `null`
   - **Toggle feature**: set per-event boolean (`notify`, `flash`, `beep`, `statusline`)
   - **Show config**: display current settings
4. Edit config.json to apply change
5. Confirm what changed in one line
</instructions>
