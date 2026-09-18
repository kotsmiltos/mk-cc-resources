'use strict';
// Weekly report rendering. header() is what the mail subject line uses.

function header(title) {
  return `${title}`;
}

function body(lines) {
  return lines.map((l) => `- ${l}`).join('\n');
}

module.exports = { header, body };
