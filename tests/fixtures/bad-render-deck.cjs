'use strict';
// INTENTIONALLY BAD — negative fixture for tests/create-enum-lint.test.js.
// Do not import. The string-literal addShape() call on line 14 must be
// caught by skills/create/scripts/lib/enum-lint.js per Phase 4 D-05 layer 2 / CRT-15.
const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';

const slide = pres.addSlide();
slide.background = { color: 'FFFFFF' };

// Banned form — string literal shape name. enum-lint.js MUST flag this:
slide.addShape('oval', { x: 1, y: 1, w: 1, h: 1 });

pres.writeFile({ fileName: 'bad-deck.pptx' });
