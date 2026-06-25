import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { qrCodeSvg } from '../modules/qr.js';

describe('qrCodeSvg', () => {
  it('renders a crisp SVG QR code for MFA setup URLs', () => {
    const svg = qrCodeSvg('otpauth://totp/Gratulationsdienst:test@example.test?secret=ABC&issuer=Test');

    assert.match(svg, /^<svg class="qr-code"/);
    assert.match(svg, /role="img"/);
    assert.match(svg, /aria-label="MFA QR-Code"/);
    assert.match(svg, /<rect x="\d+" y="\d+" width="1" height="1"><\/rect>/);
  });

  it('falls back to an empty state for invalid QR input', () => {
    assert.match(qrCodeSvg(undefined), /QR-Code konnte/);
  });
});
