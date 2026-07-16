import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
};

globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html' };
globalThis.window = globalThis;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};

const { cardBackLayoutFor, cardBackLayouts, cardLayoutFor, cardLayouts } = await import('../modules/cardLayouts.js');
const { documentBackPreview, documentPreview, printDocumentPages, printLayoutPage, printSquareCardBack, printSquareCardPage } = await import('../modules/documents.js');
const { state } = await import('../modules/state.js');

const citizen = {
  id: 'G-2026-001',
  salutation: 'Frau',
  firstName: 'Erika',
  lastName: 'Muster & Mann',
  street: 'Musterstraße',
  houseNo: '12',
  postalCode: '13437',
  district: 'Tegel',
  birthDate: '1936-06-01',
  wish: 'Besuch erwünscht'
};

const sender = {
  id: 'A-001',
  name: 'Bezirksamt',
  signature: 'Signatur',
  signatureImage: '',
  color: '#005f56',
  logo: 'BA',
  department: 'Seniorenservice',
  address: 'Eichborndamm 215',
  phone: '030 123',
  email: 'kontakt@example.test'
};

const squareTemplate = id => ({
  id,
  format: 'Quadratkarte 210 mm',
  occasion: 'Einladung',
  subject: 'Glückwunsch {{vorname}}',
  body: 'Alles Gute, {{nachname}}!'
});
const template = (id, format) => ({ ...squareTemplate(id), format });

beforeEach(() => {
  state.data = {
    citizens: [citizen],
    sokoGroups: [{ id: 'SOKO 01' }],
    sokoMembers: [],
    streets: [{
      name: 'Musterstraße',
      district: 'Tegel',
      rules: [{ plz: '13437', soko: '01', von: '1', bis: '99', art: 'F', ortsteil: 'Tegel' }]
    }],
    senders: [sender],
    templates: []
  };
  state.generatedDocs = [];
  state.printBackground = true;
  state.selectedTemplateId = 'T-001';
  state.selectedSenderId = 'A-001';
  state.selectedCitizenId = citizen.id;
});

describe('cardLayoutFor', () => {
  it('liefert das Layout zur Vorlagen-ID und sonst nichts', () => {
    assert.equal(typeof cardLayoutFor({ id: 'T-001' }), 'function');
    assert.equal(cardLayoutFor({ id: 'T-999' }), undefined);
    assert.equal(cardLayoutFor(null), undefined);
    assert.deepEqual(Object.keys(cardLayouts), ['T-001', 'T-002', 'T-003', 'T-004']);
  });
});

describe('Kartenlayout in Vorschau und Druck', () => {
  it('rendert das JS-Layout mit ersetzten und escapeten Werten in der Vorschau', () => {
    const html = documentPreview(squareTemplate('T-001'), citizen, sender);
    assert.match(html, /card-layout/);
    assert.match(html, /Glückwunsch Erika/);
    assert.match(html, /Alles Gute, Muster &amp; Mann!/);
    assert.doesNotMatch(html, /square-greeting"/);
  });

  it('fällt ohne registriertes Layout auf das Standard-Layout zurück', () => {
    const html = documentPreview(squareTemplate('T-999'), citizen, sender);
    assert.match(html, /square-greeting/);
    assert.doesNotMatch(html, /card-layout/);
  });

  it('nutzt das JS-Layout auch auf der Druckseite', () => {
    const html = printSquareCardPage(squareTemplate('T-001'), citizen, sender);
    assert.match(html, /card-layout/);
    assert.match(html, /Glückwunsch Erika/);
    assert.match(html, /page-break-after:always/);
  });
});

describe('Layouts für A5-Karte und A4-Briefe', () => {
  it('rendert Nicht-Quadrat-Layouts als mm-getreue Leinwand in der Vorschau', () => {
    const html = documentPreview(template('T-002', 'A5 Karte'), citizen, sender);
    assert.match(html, /card-layout-canvas/);
    assert.match(html, /width:148mm;height:210mm/);
    assert.match(html, /Glückwunsch Erika/);
    assert.match(html, /90/); // Alterszahl der Geburtstagskarte
    assert.doesNotMatch(html, /doc-letterhead/);
  });

  it('rendert Brief- und Einladungslayout mit Absenderdaten', () => {
    const letter = documentPreview(template('T-003', 'DIN A4 Brief'), { ...citizen, doctoralDegree: 'Dr.' }, sender);
    assert.match(letter, /width:210mm;height:297mm/);
    assert.match(letter, /Seniorenservice/);
    assert.match(letter, /Muster &amp; Mann/);
    assert.match(letter, /Frau Dr\. Erika Muster &amp; Mann/);
    const invitation = documentPreview(template('T-004', 'DIN A4 Brief'), citizen, sender);
    assert.match(invitation, /background:#005f56/);
    assert.match(invitation, /Alles Gute, Muster &amp; Mann!/);
  });

  it('baut eigenständige Druckseiten mit Format-Maßen und Seitenumbruch', () => {
    const html = printLayoutPage(template('T-002', 'A5 Karte'), citizen, sender);
    assert.match(html, /width:148mm;height:210mm/);
    assert.match(html, /page-break-after:always/);
    assert.match(html, /card-layout/);
  });

  it('nutzt die Berliner Hausschrift mit Fallback', () => {
    const html = documentPreview(template('T-003', 'DIN A4 Brief'), citizen, sender);
    assert.match(html, /font-family:'Berlin Type Office',Arial,sans-serif/);
  });
});

describe('Rückseiten-Layouts', () => {
  it('liefert das Rückseiten-Layout zur Vorlagen-ID und sonst nichts', () => {
    assert.equal(typeof cardBackLayoutFor({ id: 'T-001' }), 'function');
    assert.equal(cardBackLayoutFor({ id: 'T-002' }), undefined);
  });

  it('druckt die Quadratkarten-Rückseite über das Layout mit Adresse und Drehung', () => {
    const html = printSquareCardBack(squareTemplate('T-001'), { ...citizen, doctoralDegree: 'Dr.' }, sender);
    assert.match(html, /card-layout/);
    assert.match(html, /rotate\(180deg\)/);
    assert.match(html, /Muster &amp; Mann/);
    assert.match(html, /Frau Dr\. Erika Muster &amp; Mann/);
    assert.match(html, /page-break-after:always/);
  });

  it('zeigt das Rückseiten-Layout auch in der Vorschau', () => {
    const html = documentBackPreview(squareTemplate('T-001'), citizen, { sender });
    assert.match(html, /square-card-back/);
    assert.match(html, /card-layout/);
    assert.match(html, /Muster &amp; Mann/);
  });

  it('fällt ohne Rückseiten-Layout auf die Standard-Rückseite zurück', () => {
    const html = printSquareCardBack(squareTemplate('T-999'), citizen, sender);
    assert.match(html, /square-back-meta/);
    assert.doesNotMatch(html, /card-layout/);
  });

  it('unterdrückt die Rückseite, wenn das Layout einen leeren String liefert', () => {
    cardBackLayouts['T-999'] = () => '';
    try {
      assert.equal(printSquareCardBack(squareTemplate('T-999'), citizen, sender), '');
      assert.equal(documentBackPreview(squareTemplate('T-999'), citizen, { sender }), '');
    } finally {
      delete cardBackLayouts['T-999'];
    }
  });

  it('hängt Layout-Rückseiten auch im Seriendruck an Nicht-Quadrat-Formate an', () => {
    cardBackLayouts['T-003'] = ({ addressHtml }) => `<div class="card-layout back-test">${addressHtml}</div>`;
    try {
      state.data.templates = [template('T-003', 'DIN A4 Brief')];
      state.generatedDocs = [{ id: 'DOC-1', citizenId: citizen.id, templateId: 'T-003', senderId: sender.id }];
      const html = printDocumentPages();
      assert.match(html, /back-test/);
      assert.match(html, /width:210mm;height:297mm/);
    } finally {
      delete cardBackLayouts['T-003'];
    }
  });
});
