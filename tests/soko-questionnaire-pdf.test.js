import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pageMapper, pageRotation } from '../modules/sokoQuestionnairePdf.js';
import { SOKO_PAGE_MM, SOKO_QR_BOX } from '../modules/sokoQuestionnaire.js';

const SCALE = 4;
const canvas = { width: SOKO_PAGE_MM.width * SCALE, height: SOKO_PAGE_MM.height * SCALE };
const boxCenter = { x: SOKO_QR_BOX.left + SOKO_QR_BOX.size / 2, y: SOKO_QR_BOX.top + SOKO_QR_BOX.size / 2 };

// Erzeugt die vier erkannten QR-Ecken (px) für eine um angle gedrehte, nach center verschobene Seite.
const detectedCorners = (angle, center) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const place = (mmX, mmY) => {
    const dx = (mmX - boxCenter.x) * SCALE;
    const dy = (mmY - boxCenter.y) * SCALE;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  };
  const { left, top, size } = SOKO_QR_BOX;
  return [place(left, top), place(left + size, top), place(left + size, top + size), place(left, top + size)];
};

const closeTo = (point, expected, eps = 1e-6) => {
  assert.ok(Math.abs(point.x - expected.x) < eps, `x ${point.x} ≈ ${expected.x}`);
  assert.ok(Math.abs(point.y - expected.y) < eps, `y ${point.y} ≈ ${expected.y}`);
};

describe('SOKO questionnaire PDF registration', () => {
  it('falls back to plain mm→px scaling without QR corners', () => {
    const mapper = pageMapper(canvas, null);
    closeTo(mapper({ x: 19, y: 153 }), { x: 19 * SCALE, y: 153 * SCALE });
  });

  it('reduces to scale + offset when the QR is detected without rotation', () => {
    const center = { x: 740, y: 140 };
    const mapper = pageMapper(canvas, { points: detectedCorners(0, center) });
    const offset = { x: center.x - boxCenter.x * SCALE, y: center.y - boxCenter.y * SCALE };
    closeTo(mapper({ x: 19, y: 153 }), { x: 19 * SCALE + offset.x, y: 153 * SCALE + offset.y });
  });

  it('recovers the scan rotation from the QR corners', () => {
    const angle = (7 * Math.PI) / 180;
    assert.ok(Math.abs(pageRotation(detectedCorners(angle, { x: 736, y: 128 })) - angle) < 1e-9);
  });

  it('maps far fields through the same rotation about the detected QR center', () => {
    const angle = (-5 * Math.PI) / 180;
    const center = { x: 760, y: 150 };
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const mapper = pageMapper(canvas, { points: detectedCorners(angle, center) });
    for (const field of [{ x: 19, y: 153 }, { x: 104, y: 149 }, { x: 192, y: 40 }]) {
      const dx = (field.x - boxCenter.x) * SCALE;
      const dy = (field.y - boxCenter.y) * SCALE;
      closeTo(mapper(field), { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos }, 1e-6);
    }
  });
});
