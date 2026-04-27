'use strict';
// samples.js — runtime data binding for annotate.js. setSamples(arr) is called by index.js
// before require('./annotate') so main()'s `for (const sample of SAMPLES)` reads the
// adapted findings (per ANNO-04 + RESEARCH.md Pattern 1 "VERBATIM file with override-export shim").

let SAMPLES = [];
function setSamples(arr) { SAMPLES = arr; }
module.exports = { get SAMPLES() { return SAMPLES; }, setSamples };
