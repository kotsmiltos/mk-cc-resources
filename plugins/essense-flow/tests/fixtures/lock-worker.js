"use strict";

const { workerData, parentPort } = require("worker_threads");
const lf = require("../../lib/lockfile");
const result = lf.acquireLock(workerData.dir, "test");
parentPort.postMessage(result);
