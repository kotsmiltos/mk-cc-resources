"use strict";

const path = require("path");
const yamlIO = require("./yaml-io");
const paths = require("./paths");

const EXCHANGES_FILE = "exchanges.yaml";
const SCHEMA_VERSION = 1;

/**
 * Build the path to the exchange log file for a given phase.
 * Creates the parent directory if it doesn't exist.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} phase — phase name (e.g., "elicitation", "architecture")
 * @returns {{ ok: boolean, logPath: string }}
 */
function createLog(pipelineDir, phase) {
  const phaseDir = path.join(pipelineDir, phase);
  paths.ensureDir(phaseDir);
  const logPath = path.join(phaseDir, EXCHANGES_FILE);
  return { ok: true, logPath };
}

/**
 * Append an exchange to the log file.
 * Reads existing exchanges, appends the new one, and writes atomically.
 *
 * @param {string} logPath — absolute path to exchanges.yaml
 * @param {Object} exchange — { round, timestamp, system, user, areas_touched, decisions_made }
 * @returns {{ ok: boolean, count: number }}
 */
function appendExchange(logPath, exchange) {
  const data = yamlIO.safeReadWithFallback(logPath) || {
    schema_version: SCHEMA_VERSION,
    exchanges: [],
  };

  if (!Array.isArray(data.exchanges)) {
    data.exchanges = [];
  }

  if (!exchange.timestamp) {
    exchange.timestamp = new Date().toISOString();
  }

  data.exchanges.push(exchange);
  yamlIO.safeWrite(logPath, data);

  return { ok: true, count: data.exchanges.length };
}

/**
 * Load all exchanges from a log file.
 *
 * @param {string} logPath — absolute path to exchanges.yaml
 * @returns {Array<Object>} array of exchange objects, or empty array if file is missing/empty
 */
function loadExchanges(logPath) {
  const data = yamlIO.safeReadWithFallback(logPath);
  if (!data || !Array.isArray(data.exchanges)) {
    return [];
  }
  return data.exchanges;
}

/**
 * Return the last exchange from the log, or null if none exist.
 *
 * @param {string} logPath — absolute path to exchanges.yaml
 * @returns {Object|null}
 */
function getLastExchange(logPath) {
  const exchanges = loadExchanges(logPath);
  if (exchanges.length === 0) {
    return null;
  }
  return exchanges[exchanges.length - 1];
}

/**
 * Return the number of exchanges in the log.
 *
 * @param {string} logPath — absolute path to exchanges.yaml
 * @returns {number}
 */
function getExchangeCount(logPath) {
  return loadExchanges(logPath).length;
}

module.exports = { createLog, appendExchange, loadExchanges, getLastExchange, getExchangeCount };
