import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pageMapper, pageRotation } from '../modules/sokoQuestionnairePdf.js';
import { SOKO_PAGE_MM, SOKO_QR_BOX, SOKO_QR_BOXES } from '../modules/sokoQuestionnaire.js';

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

  it('derives the scale from the QR size and version instead of the canvas dimensions', () => {
    const version = 1;
    const symbolMm = SOKO_QR_BOX.size * (17 + 4 * version) / (17 + 4 * version + 8);
    const side = 80;
    const c = { x: 900, y: 250 };
    const half = side / 2;
    const points = [{ x: c.x - half, y: c.y - half }, { x: c.x + half, y: c.y - half }, { x: c.x + half, y: c.y + half }, { x: c.x - half, y: c.y + half }];
    const s = side / symbolMm;
    assert.ok(Math.abs(s - SCALE) > 1, 'QR-Maßstab muss sich vom Canvas-Maßstab unterscheiden');
    const mapper = pageMapper(canvas, { points, version });
    closeTo(mapper({ x: boxCenter.x + 10, y: boxCenter.y }), { x: c.x + 10 * s, y: c.y });
    closeTo(mapper({ x: boxCenter.x, y: boxCenter.y + 10 }), { x: c.x, y: c.y + 10 * s });
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

  it('uses both QR anchors for a precise long-baseline similarity transform', () => {
    const angle = (3 * Math.PI) / 180;
    const s = 5;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const centers = SOKO_QR_BOXES.map(b => ({ x: b.left + b.size / 2, y: b.top + b.size / 2 }));
    const cMm = { x: (centers[0].x + centers[1].x) / 2, y: (centers[0].y + centers[1].y) / 2 };
    const cPx = { x: 800, y: 600 };
    const project = p => {
      const dx = (p.x - cMm.x) * s, dy = (p.y - cMm.y) * s;
      return { x: cPx.x + dx * cos - dy * sin, y: cPx.y + dx * sin + dy * cos };
    };
    const quad = c => [c, c, c, c];
    // bewusst in umgekehrter Reihenfolge: matchAnchors muss oben-rechts/unten-links korrekt zuordnen
    const mapper = pageMapper(canvas, [{ points: quad(project(centers[1])) }, { points: quad(project(centers[0])) }]);
    for (const field of [{ x: 19, y: 153 }, { x: 104, y: 167 }, { x: 192, y: 40 }]) {
      closeTo(mapper(field), project(field));
    }
  });
});
