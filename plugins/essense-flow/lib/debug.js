"use strict";

function trace(label, data) {
  if (!process.env.ESSENSE_DEBUG) return;
  const line = `[essense-flow:debug] ${label}` + (data ? ` ${JSON.stringify(data)}` : "");
  process.stderr.write(line + "\n");
}

module.exports = { trace };
