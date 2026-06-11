import QRCode from 'qrcode';

export const qrCodeSvg = text => {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const margin = 4;
    const size = qr.modules.size;
    const viewSize = size + margin * 2;
    const rects = [...qr.modules.data].map((dark, index) => {
      if (!dark) return "";
      const x = (index % size) + margin;
      const y = Math.floor(index / size) + margin;
      return `<rect x="${x}" y="${y}" width="1" height="1"></rect>`;
    }).join("");
    return `<svg class="qr-code" viewBox="0 0 ${viewSize} ${viewSize}" role="img" aria-label="MFA QR-Code" shape-rendering="crispEdges"><rect width="${viewSize}" height="${viewSize}" fill="#fff"></rect><g fill="#202426">${rects}</g></svg>`;
  } catch {
    return `<div class="empty-state">QR-Code konnte für diese Adresse nicht erzeugt werden.</div>`;
  }
};
