# alert-sounds

Hear when Claude Code needs you. Sound, desktop notification, taskbar flash and a statusline
colour on the events that matter — finished, waiting for permission, idle.

## Install

```
/plugin marketplace add kotsmiltos/mk-cc-resources
/plugin install alert-sounds@mk-cc-resources
```

Hooks register on install. Nothing else to configure.

## Events

| Event | Fires when | Default sound |
|---|---|---|
| `stop` | The task finished | Rising three-tone chime |
| `permission` | A tool is waiting for your approval | Double-tap + high tone |
| `idle` | Claude is waiting for input | Low double-pulse + rise |

## Configure

`/alert-sounds` walks you through volume, mute and per-event toggles. Or edit `config.json` in
the plugin directory directly:

```json
{
  "stop":       { "beep": true, "sound": null, "notify": true, "flash": true, "statusline": true },
  "permission": { "beep": true, "sound": null, "notify": true, "flash": true, "statusline": true },
  "idle":       { "beep": true, "sound": null, "notify": true, "flash": true, "statusline": true }
}
```

Point `"sound"` at an mp3/wav/ogg/aiff file for your own; `"beep": false` silences that event.

## Platforms

- **Windows** — console tones, balloon notifications, taskbar flash
- **WSL2** — routed to the Windows host through `powershell.exe`
- **macOS** — `afplay` sounds, Notification Center via `osascript`, dock bounce
- **Linux** — `paplay` / `ffplay` / `aplay`, desktop notifications via `notify-send`
- Everywhere — terminal bell as the last resort

See [CHANGELOG.md](CHANGELOG.md) for what changed between versions.
