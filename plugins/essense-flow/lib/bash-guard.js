"use strict";

const { MAX_COMMAND_LENGTH } = require("./constants");

const SAFE_BASH_COMMANDS = new Set([
  "cat", "ls", "echo", "pwd", "head", "tail",
  "grep", "wc", "diff", "find",
]);

const SAFE_GIT_SUBCOMMANDS = new Set(["log", "show", "status", "diff"]);

const SHELL_CHAIN_PATTERN = /[;&|`\r\n\0]|\$\(/;

function isSafeCommand(cmd) {
  if (typeof cmd !== "string" || cmd.length > MAX_COMMAND_LENGTH) return false;
  if (SHELL_CHAIN_PATTERN.test(cmd)) return false;
  const tokens = cmd.trimStart().split(/\s+/);
  if (!tokens[0]) return false;
  const word = tokens[0];
  if (word === "git") return tokens.length >= 2 && SAFE_GIT_SUBCOMMANDS.has(tokens[1]);
  return SAFE_BASH_COMMANDS.has(word);
}

module.exports = { isSafeCommand, SAFE_BASH_COMMANDS, SAFE_GIT_SUBCOMMANDS, SHELL_CHAIN_PATTERN };
