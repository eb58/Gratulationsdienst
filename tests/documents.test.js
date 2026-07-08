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

const documents = await import('../modules/documents.js');
const { state } = await import('../modules/state.js');

const {
  compactBirthdayCardBody,
  documentBackPreview,
  documentDesignClass,
  documentFormat,
  documentPreview,
  letterSalutation,
  preparePrint,
  printFormatClass,
  printDocumentPages,
  printPageSettings,
  printSquareCardBack,
  printSquareCardPage,
  renderSokoForm,
  renderSokoQuittung,
  renderTemplate,
  templateBackBackgroundImage,
  templateBackgroundImage
} = documents;

const citizen = {
  id: 'G-2026-001',
  salutation: 'Frau',
  firstName: 'Erika',
  lastName: 'Mustermann',
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
  color: '#005f56',
  logo: 'BA',
  department: 'Seniorenservice',
  address: 'Eichborndamm 215',
  phone: '030 123',
  email: 'kontakt@example.test'
};

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

describe('document salutations and formats', () => {
  it('creates formal salutations', () => {
    assert.equal(letterSalutation('Herr'), 'Sehr geehrter Herr');
    assert.equal(letterSalutation('Frau'), 'Sehr geehrte Frau');
    assert.equal(letterSalutation(''), 'Sehr geehrte Damen und Herren');
  });

  it('detects page format classes and print settings', () => {
    assert.deepEqual(documentFormat({ format: 'DIN A4 quer' }), { className: 'format-a4-landscape', orientation: 'landscape', size: 'a4' });
    assert.deepEqual(documentFormat({ format: 'A5 Karte' }), { className: 'format-a5', orientation: 'portrait', size: 'a5' });
    assert.equal(printFormatClass({ format: 'Quadratkarte 210 mm' }), 'format-square');
    assert.deepEqual(printPageSettings('A5 Karte quer'), { size: 'A5 landscape', className: 'format-a5-landscape' });
  });

  it('selects design classes from format and occasion', () => {
    assert.equal(documentDesignClass({ format: 'Quadratkarte 210 mm', occasion: 'Geburtstag' }), 'square-greeting-card');
    assert.equal(documentDesignClass({ format: 'A5 Karte', occasion: 'Geburtstag' }), 'birthday-card');
    assert.equal(documentDesignClass({ format: 'DIN A4 Brief', occasion: 'Einladung' }), '');
  });
});

describe('template rendering', () => {
  it('replaces template tokens with citizen, sender and SOKO values', () => {
    const rendered = renderTemplate({
      subject: 'Glückwunsch {{vorname}} {{nachname}}',
      body: '{{anrede}} {{nachname}}\n{{strasse}}\n{{plz}} {{ortsteil}}\n{{soko}}\n{{absender}}\n{{alter}}'
    }, citizen, sender);

    assert.equal(rendered.subject, 'Glückwunsch Erika Mustermann');
    assert.match(rendered.body, /Sehr geehrte Frau Mustermann/);
    assert.match(rendered.body, /Musterstraße 12/);
    assert.match(rendered.body, /13437 Tegel/);
    assert.match(rendered.body, /SOKO 01/);
    assert.match(rendered.body, /Bezirksamt/);
  });

  it('uses age-specific template text with fallback to the default body', () => {
    const template = {
      subject: 'Glückwunsch {{alter}}',
      body: 'Standard {{alter}}',
      ageTexts: {
        90: 'Spezialtext {{alter}} {{nachname}}'
      }
    };

    assert.equal(renderTemplate(template, citizen, sender).body, 'Spezialtext 90 Mustermann');
    assert.equal(renderTemplate(template, { ...citizen, birthDate: '1941-06-01' }, sender).body, 'Standard 85');
  });

  it('trims background image values', () => {
    assert.equal(templateBackgroundImage({ backgroundImage: ' data:image/png;base64,abc ' }), 'data:image/png;base64,abc');
    assert.equal(templateBackBackgroundImage({ backBackgroundImage: ' back ' }), 'back');
  });

  it('builds compact birthday card text with salutation and age', () => {
    const body = compactBirthdayCardBody(citizen);
    assert.match(body, /^Frau Mustermann,/);
    assert.match(body, /90\. Geburtstag/);
  });
});

describe('document previews and print pages', () => {
  const template = {
    id: 'T-001',
    name: 'Test',
    occasion: 'Geburtstag',
    format: 'Quadratkarte 210 mm',
    subject: 'Titel {{vorname}}',
    body: 'Text {{nachname}}',
    backgroundImage: 'front.png',
    backBackgroundImage: 'back.png'
  };

  it('renders empty, front and back previews with escaped data', () => {
    assert.match(documentPreview(template, null, sender), /Kein Jubilar/);

    const front = documentPreview(template, { ...citizen, lastName: '<Mustermann>' }, sender);
    const back = documentBackPreview(template, citizen);

    assert.match(front, /square-greeting-card/);
    assert.match(front, /front\.png/);
    assert.match(front, /&lt;Mustermann&gt;/);
    assert.match(back, /square-card-back/);
    assert.match(back, /back\.png/);
    assert.match(back, /01&nbsp;&nbsp;01/);
  });

  it('suppresses non-square back previews unless a back image or blank page is requested', () => {
    const plain = { ...template, format: 'DIN A4 Brief', backBackgroundImage: '' };

    assert.equal(documentBackPreview(plain, citizen), '');
    assert.match(documentBackPreview(plain, citizen, { includeBlank: true }), /document-back-preview/);
    assert.match(documentBackPreview({ ...plain, backBackgroundImage: 'back.png' }, citizen), /back\.png/);
  });

  it('renders square print pages and respects disabled background printing', () => {
    const front = printSquareCardPage(template, citizen, sender);
    const back = printSquareCardBack(template, citizen);

    assert.match(front, /front\.png/);
    assert.match(back, /back\.png/);
    assert.match(back, /transform:rotate\(180deg\)/);

    state.printBackground = false;
    assert.doesNotMatch(printSquareCardPage(template, citizen, sender), /front\.png/);
    assert.doesNotMatch(printSquareCardBack(template, citizen), /back\.png/);
  });

  it('builds print pages from generated document metadata', () => {
    state.data.templates = [template];
    state.generatedDocs = [
      { citizenId: citizen.id, templateId: template.id, senderId: sender.id },
      { citizenId: 'missing', templateId: template.id, senderId: sender.id }
    ];

    const pages = printDocumentPages();

    assert.match(pages, /front\.png/);
    assert.match(pages, /back\.png/);
    assert.doesNotMatch(pages, /missing/);
  });

  it('prepares print CSS for the first generated document', () => {
    const classes = new Set();
    const removed = [];
    const appended = [];
    globalThis.document = {
      body: {
        classList: {
          remove: (...names) => names.forEach(name => classes.delete(name)),
          add: name => classes.add(name)
        }
      },
      head: { append: element => appended.push(element) },
      createElement: tag => ({ tag, id: '', textContent: '' }),
      getElementById: id => id === 'dynamic-print-style' ? { remove: () => removed.push(id) } : null
    };
    state.data.templates = [template];
    state.generatedDocs = [{ citizenId: citizen.id, templateId: template.id, senderId: sender.id }];

    assert.equal(preparePrint(), true);
    assert.equal(classes.has('print-format-square'), true);
    assert.deepEqual(removed, ['dynamic-print-style']);
    assert.match(appended[0].textContent, /210mm 210mm/);
  });
});

describe('SOKO print artifacts', () => {
  it('renders receipt totals, leader data and placeholder rows', () => {
    state.data.sokoMembers = [{
      salutation: 'Frau',
      firstName: 'Lea',
      lastName: 'Leitung',
      groupId: 'SOKO 01',
      street: 'Leiterweg 1',
      postalCode: '13437',
      city: 'Berlin',
      zpNr: 'ZP-1',
      isLeader: true
    }];

    const html = renderSokoQuittung([citizen, { ...citizen, id: 'G-2', firstName: 'Max' }], 'SOKO 01', '8,50', '030', '06', '3930', '68154');

    assert.match(html, /17,00/);
    assert.match(html, /Lea Leitung/);
    assert.match(html, /ZP-1/);
    assert.equal((html.match(/height:8mm/g) || []).length, 12);
  });

  it('splits receipts over 12 citizens into multiple pages with a correct sum per page', () => {
    const citizens = Array.from({ length: 13 }, (_, i) => ({ ...citizen, id: `G-${i}`, firstName: `Person${i}` }));

    const html = renderSokoQuittung(citizens, 'SOKO 01', '8,50', '030', '06', '3930', '68154');

    assert.equal((html.match(/height:8mm/g) || []).length, 24);
    assert.equal((html.match(/Gesamtbetrag Euro/g) || []).length, 2);
    assert.equal((html.match(/102,00 €/g) || []).length, 2);
    assert.equal((html.match(/>8,50 €/g) || []).length, 15);
  });

  it('renders SOKO questionnaire forms with assignment, date and contact data', () => {
    const html = renderSokoForm({ ...citizen, phone: '030 999' }, 4);

    assert.doesNotMatch(html, /<img\b/);
    assert.match(html, /Bezirksamt Reinickendorf/);
    assert.match(html, /SOKO 01/);
    assert.match(html, /005 \/ 06/);
    assert.ok(html.indexOf('005 / 06') < html.indexOf('Lfd. Nr. / Monat'));
    assert.match(html, /left:104mm;top:22mm;width:91mm;height:58mm;[\s\S]*?005 \/ 06<\/div><\/div>/);
    assert.match(html, /left:166mm;top:80mm;width:29mm;height:9mm;[\s\S]*?Lfd\. Nr\. \/ Monat/);
    assert.match(html, /width:82mm;height:14mm;[\s\S]*?innerhalb von drei Wochen<\/strong><br>ausgef&uuml;llt/);
    assert.match(html, /030 999/);
  });
});
