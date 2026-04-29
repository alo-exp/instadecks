// Negative fixture for tools/lint-pptxgenjs-enums.js — pres.shapes.RECT typo (HARD-01).
module.exports = (pres) => pres.addShape(pres.shapes.RECT, { x: 0, y: 0, w: 1, h: 1 });
