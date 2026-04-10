# essense-flow Release Notes

## 0.1.0 (2026-04-10)

Initial release.

- Multi-phase AI development pipeline: Research, Architecture, Build, Review, Context
- State machine with phase transitions and validation
- Context injection hook (UserPromptSubmit) — injects pipeline state, config, and rules
- YAML validation hook (PostToolUse) — validates YAML after Write/Edit
- Session orientation hook (Notification) — orients new sessions to pipeline state
- Slash commands: /init, /research, /architect, /build, /review, /status, /next
- Skills: research, architect, build, context
- Brief assembly, synthesis, consistency checking, and dispatch utilities
- Self-test and plugin validation scripts
