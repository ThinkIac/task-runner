#!/usr/bin/env node
'use strict';
const { main } = require('./dist/cli.cjs');
module.exports = { main };
if (require.main === module) main().then(code => { process.exitCode = code; }, error => { console.error(`[tasks] ${error.message}`); process.exitCode = 1; });
