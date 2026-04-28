'use strict';
// tests/helpers/annotate-vm.js — Plan 08-03 test-only helper.
// Loads skills/annotate/scripts/annotate.js into a vm context with a stub `require`
// (no pptxgenjs side effects, no main() execution) and returns the internal
// helpers (charPts, wordWrapLineCount, estimateBoxH, seg, circleDot,
// drawBarArrowMerged, arrowTB, annotBox, annotBoxTB, buildSlide) plus the
// module-level constants. NO source change to annotate.js — vm escape hatch only.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ANNOTATE_SRC_PATH = path.join(
  __dirname, '..', '..', 'skills', 'annotate', 'scripts', 'annotate.js',
);

function loadAnnotateInternals({ samples = [], pptxStub = null } = {}) {
  const raw = fs.readFileSync(ANNOTATE_SRC_PATH, 'utf8');
  // Strip the trailing top-level `main().catch(...)` invocation so requiring
  // the source does not write a PPTX or exit. Everything before it (constants,
  // helpers, function declarations) is preserved verbatim.
  const stripped = raw.replace(/main\(\)\.catch\([\s\S]*?\}\);\s*$/m, '');

  const PptxGenJSStub = pptxStub || function PptxGenJSStub() {
    return {
      layout: '',
      shapes: { LINE: 'LINE', OVAL: 'OVAL', CUSTOM_GEOMETRY: 'CUSTOM_GEOMETRY' },
      addSlide() {
        return {
          background: null,
          addShape() {},
          addText() {},
          addImage() {},
        };
      },
      writeFile: async () => {},
    };
  };

  const stubRequire = (id) => {
    if (id === 'pptxgenjs') return PptxGenJSStub;
    if (id === './samples') return { SAMPLES: samples };
    if (id === 'path') return require('node:path');
    return require(id);
  };

  // Capture a wide net of helpers by appending an export object inside the script.
  const exposer = `
;__exposed__ = {
  charPts: (typeof charPts !== 'undefined' ? charPts : undefined),
  wordWrapLineCount: (typeof wordWrapLineCount !== 'undefined' ? wordWrapLineCount : undefined),
  estimateBoxH: (typeof estimateBoxH !== 'undefined' ? estimateBoxH : undefined),
  seg: (typeof seg !== 'undefined' ? seg : undefined),
  circleDot: (typeof circleDot !== 'undefined' ? circleDot : undefined),
  drawBarArrowMerged: (typeof drawBarArrowMerged !== 'undefined' ? drawBarArrowMerged : undefined),
  arrowTB: (typeof arrowTB !== 'undefined' ? arrowTB : undefined),
  annotBox: (typeof annotBox !== 'undefined' ? annotBox : undefined),
  annotBoxTB: (typeof annotBoxTB !== 'undefined' ? annotBoxTB : undefined),
  buildSlide: (typeof buildSlide !== 'undefined' ? buildSlide : undefined),
  main: (typeof main !== 'undefined' ? main : undefined),
  // constants
  SW, SH, FOOTER_Y, COL_W, COL_PAD,
  MINI_GAP, MINI_X, MINI_W, MINI_H, MINI_Y, R_COL_X,
  BOX_W, BOX_GAP, SEV_H, SEV_GAP, TEXT_PAD_B, BAR_W, BOX_X_L, BOX_X_R,
  LINE_H, LINE_H_BAR, BAR_TOP_OFFSET, COLUMN_PT, BAR_GAP, ARROW_TRANS, MAX_SIDE,
  C, SEV,
};
`;

  const ctx = {
    require: stubRequire,
    module: { exports: {} },
    exports: {},
    console,
    process: { env: process.env },
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    __dirname: path.dirname(ANNOTATE_SRC_PATH),
    __filename: ANNOTATE_SRC_PATH,
    __exposed__: null,
    setTimeout, clearTimeout,
  };
  vm.createContext(ctx);
  vm.runInContext(stripped + exposer, ctx, { filename: ANNOTATE_SRC_PATH });
  return ctx.__exposed__;
}

// Build a recording fake `pres`/`slide` so tests can assert addShape / addText
// invocation sequences without rendering a real PPTX.
function makeRecordingPres() {
  const calls = [];
  const slide = {
    background: null,
    addShape(kind, opts) { calls.push({ method: 'addShape', kind, opts }); },
    addText(text, opts)  { calls.push({ method: 'addText', text, opts }); },
    addImage(opts)       { calls.push({ method: 'addImage', opts }); },
  };
  const pres = {
    layout: '',
    shapes: { LINE: 'LINE', OVAL: 'OVAL', CUSTOM_GEOMETRY: 'CUSTOM_GEOMETRY' },
    addSlide() { return slide; },
  };
  return { pres, slide, calls };
}

module.exports = { loadAnnotateInternals, makeRecordingPres, ANNOTATE_SRC_PATH };
