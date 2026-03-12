---
name: alert-sounds
description: Configure alert sounds — volume, mute/unmute, custom sounds per event
tools: [Read, Edit, Glob]
---

<objective>
Modify the alert-sounds plugin configuration: adjust volume, mute/unmute sounds, and assign custom sound files to events.
</objective>

<context>
Find the config file by searching for the plugin's config:

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
- `volume` (0-100): Global volume level. Default 100. Applies to custom sounds (all platforms) and built-in tones (macOS/Linux). Windows Console::Beep ignores this — it uses system volume.
- `muted` (true/false): Suppresses all sounds. Visual alerts (notifications, flash, statusline) still fire. Default false.
- Per-event objects (`stop`, `permission`, `idle`):
  - `sound`: Absolute path to a sound file (mp3/wav/ogg/aiff), or `null` for built-in tones
  - `beep`: Play built-in tones when no custom sound is set (true/false)
  - `notify`: Show desktop notifications (true/false)
  - `flash`: Flash taskbar/dock (true/false)
  - `statusline`: Show status line color indicator (true/false)

Events:
- `stop` — Claude finished a task
- `permission` — a tool needs user approval
- `idle` — Claude is waiting for input
</context>

<instructions>
1. Use Glob to find the config file: `**/alert-sounds/hooks/config.json`
2. Read the config file
3. Apply the user's requested change:
   - **Volume**: set `"volume"` to the requested value (0-100)
   - **Mute**: set `"muted"` to `true`
   - **Unmute**: set `"muted"` to `false`
   - **Custom sound**: set the event's `"sound"` to the file path the user provided
   - **Reset sound**: set the event's `"sound"` to `null` (reverts to built-in tone)
   - **Toggle feature**: set the relevant per-event boolean (`notify`, `flash`, `beep`, `statusline`)
   - **Show config**: display the current settings in a readable format
4. Use the Edit tool to apply the change to config.json
5. Confirm what was changed in one line
</instructions>
