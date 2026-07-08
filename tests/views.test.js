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
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html', search: '' };
globalThis.window = globalThis;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.document = { querySelectorAll: () => [], querySelector: () => null };
globalThis.REINICKENDORF_ADDRESS_POINTS = {
  addresses: [{ street: 'Teststraße', houseNumber: '12', postalCode: '13437', soko: '01', lon: 13, lat: 52 }]
};
globalThis.REINICKENDORF_STREET_GEOMETRIES = {
  bbox: [13, 52, 13.1, 52.1],
  segments: [{ name: 'Teststraße', coords: [[13, 52], [13.1, 52.1]] }]
};

const viewModule = await import('../modules/views.js');
const { state } = await import('../modules/state.js');

const {
  authView,
  citizenDetailContent,
  regionAssignmentContent,
  mapHoverInfoHtml,
  refreshMapInfoCache,
  sokoMapInfoHtml,
  views
} = viewModule;

const citizen = {
  id: 'G-1',
  salutation: 'Frau',
  firstName: 'Erika',
  lastName: 'Mustermann',
  street: 'Teststraße',
  houseNo: '12',
  postalCode: '13437',
  district: 'Tegel',
  birthDate: '1936-06-01',
  status: 'geprüft',
  wish: 'Besuch erwünscht',
  email: 'erika@example.test',
  phone: '030 999',
  notes: '<notiz>'
};

const sender = {
  id: 'A-001',
  role: 'Bezirksamt',
  name: 'Bezirksamt Reinickendorf',
  logo: 'BA',
  department: 'Seniorenservice',
  address: 'Eichborndamm 215',
  phone: '030 123',
  email: 'kontakt@example.test',
  color: '#005f56',
  signature: 'Signatur'
};

const template = {
  id: 'T-001',
  name: 'Standard',
  occasion: 'Geburtstag',
  format: 'DIN A4 Brief',
  senderId: sender.id,
  subject: 'Glückwunsch {{vorname}}',
  body: 'Text {{nachname}}',
  backgroundImage: '',
  backBackgroundImage: '',
  updatedAt: '2026-01-01'
};

beforeEach(() => {
  state.auth = {
    ready: true,
    setupRequired: false,
    mode: 'login',
    token: '',
    user: { id: 'u1', email: 'admin@example.test', displayName: 'Admin', role: 'admin', active: true, mfaEnabled: false },
    mfaTicket: '',
    resetToken: '',
    users: [{ id: 'u1', email: 'admin@example.test', displayName: 'Admin', role: 'admin', active: true, mfaEnabled: false }],
    mfaSetup: null,
    message: ''
  };
  state.data = {
    citizens: [citizen],
    weddingAnniversaries: [{
      id: 'WA-G-1-golden',
      citizenId: citizen.id,
      firstName: citizen.firstName,
      lastName: citizen.lastName,
      weddingAnniversary: 'Goldene Hochzeit',
      weddingDate: `${new Date().getFullYear() - 50}-06-01`,
      spouseName: 'Heinz',
      source: 'Fragebogen',
      capturedAt: '2026-06-01'
    }],
    sokoGroups: [{ id: 'SOKO 01', region: 'Tegel - Teststraße', leaderId: 'S-001' }],
    sokoMembers: [{
      id: 'S-001',
      salutation: 'Frau',
      firstName: 'Lea',
      lastName: 'Leitung',
      groupId: 'SOKO 01',
      email: 'lea@example.test',
      phone: '030 111',
      mobile: '',
      street: 'Leiterweg 1',
      postalCode: '13437',
      city: 'Berlin',
      termFrom: '2024-01-01',
      termTo: '2028-12-31',
      bank: '',
      allowance: '35,00',
      billingAmount: '15,00',
      isLeader: true
    }],
    streets: [{
      id: 'STR-001',
      name: 'Teststraße',
      district: 'Tegel',
      groupId: 'SOKO 01',
      rules: [{ id: 'R-1', plz: '13437', ortsteil: 'Tegel', von: '1', bis: '99', art: 'F', soko: '01' }]
    }],
    senders: [sender],
    templates: [template]
  };
  state.filters = { q: '', month: '06', weddingMonth: 'alle', groupId: 'alle', age: 'alle', status: 'alle', occasion: 'Geburtstag' };
  state.showAllWeddingAnniversaries = true;
  state.quittungBetrag = '8,50';
  state.quittungTelefon = '030 123';
  state.quittungKapitel = '3930';
  state.quittungTitel = '68154';
  state.selectedCitizenId = citizen.id;
  state.selectedMemberId = 'S-001';
  state.selectedStreetId = 'STR-001';
  state.selectedSenderId = sender.id;
  state.selectedTemplateId = template.id;
  state.selectedUserId = 'u1';
  state.generatedDocs = [{
    id: 'DOC-G-1',
    citizenId: citizen.id,
    templateId: template.id,
    senderId: sender.id,
    recipient: 'Erika Mustermann',
    address: 'Teststraße 12, 13437 Berlin',
    groupId: 'SOKO 01',
    wish: 'Besuch erwünscht',
    templateName: template.name,
    sender: sender.role,
    createdAt: '2026-06-01'
  }];
  state.printBackground = true;
  state.showMapPeople = true;
  state.importText = 'Vorname;Nachname';
  state.importMissingCitizens = [];
  state.dashboardSort = { key: 'group', dir: 'asc' };
});

describe('authView', () => {
  it('renders login, setup, MFA and reset states', () => {
    assert.match(authView(), /auth-login-form/);

    state.auth.setupRequired = true;
    assert.match(authView(), /auth-setup-form/);

    state.auth.setupRequired = false;
    state.auth.mfaTicket = 'ticket';
    assert.match(authView(), /auth-mfa-form/);

    state.auth.mfaTicket = '';
    state.auth.mode = 'reset';
    state.auth.message = '<Fehler>';
    assert.match(authView(), /auth-reset-request-form/);
    assert.match(authView(), /&lt;Fehler&gt;/);
  });
});

describe('view partials', () => {
  it('renders citizen and region forms with escaped user data', () => {
    assert.match(citizenDetailContent(citizen), /&lt;notiz&gt;/);
    assert.match(citizenDetailContent(citizen), /data-action="save-citizen"/);

    const region = regionAssignmentContent();
    assert.match(region, /street-form/);
    assert.match(region, /Abschnitt hinzufügen/);
    assert.match(region, /Erika Mustermann/);
  });

  it('places citizen actions and likely edited fields before personal data', () => {
    const html = citizenDetailContent(citizen);

    assert.ok(html.indexOf('data-action="save-citizen"') < html.indexOf('name="wish"'));
    assert.ok(html.indexOf('name="wish"') < html.indexOf('citizen-personal-section'));
    assert.ok(html.indexOf('name="notes"') < html.indexOf('citizen-personal-section'));
    assert.ok(html.indexOf('citizen-personal-section') < html.indexOf('name="firstName"'));
  });

  it('shows an explicit empty questionnaire state for citizens without scans', () => {
    const html = views.citizens();

    assert.match(html, /citizen-questionnaire-panel/);
    assert.match(html, /Kein Fragebogen geladen/);
    assert.doesNotMatch(html, /citizen-questionnaire-image/);
  });

  it('shows questionnaire scans without the import date caption', () => {
    state.data.citizens = [{
      ...citizen,
      sokoQuestionnaireImages: [{ image: 'data:image/png;base64,abc', createdAt: '2026-06-01' }]
    }];

    const html = views.citizens();

    assert.match(html, /citizen-questionnaire-image/);
    assert.doesNotMatch(html, /<figcaption>/);
    assert.doesNotMatch(html, /01\.06\.2026/);
  });

  it('renders map info for empty and assigned SOKO selections', () => {
    assert.match(sokoMapInfoHtml('offen'), /Über eine SOKO/);

    const html = sokoMapInfoHtml('SOKO 01', 'Teststraße');
    assert.match(html, /Teststraße/);
    assert.match(html, /Lea Leitung/);
    assert.match(html, /Erika Mustermann/);
    assert.match(html, /1 Adressen/);

    state.showMapPeople = false;
    const hiddenHtml = sokoMapInfoHtml('SOKO 01', 'Teststraße');
    assert.doesNotMatch(hiddenHtml, /Lea Leitung/);
    assert.doesNotMatch(hiddenHtml, /Erika Mustermann/);
    assert.match(hiddenHtml, /1 Adressen/);
  });

  it('precomputes map hover data once per render context', () => {
    const cache = refreshMapInfoCache();

    assert.equal(cache.addrCounts['SOKO 01'], 1);
    assert.equal(cache.segCounts['SOKO 01'], 1);
    assert.match(mapHoverInfoHtml('SOKO 01', 'Teststraße'), /Lea Leitung/);
  });
});

describe('main views', () => {
  it('renders operational views with their key controls', () => {
    state.data.citizens = [
      { ...citizen, id: 'G-85', birthDate: '1941-06-01' },
      { ...citizen, id: 'G-90', birthDate: '1936-06-01' },
      { ...citizen, id: 'G-91', birthDate: '1935-06-01', salutation: 'Herr' }
    ];
    const dashboard = views.dashboard();
    assert.match(dashboard, /SOKO Statistiken/);
    assert.match(dashboard, /age-histogram/);
    assert.match(dashboard, />85</);
    assert.match(dashboard, />90</);
    assert.match(dashboard, /Statistik nach Geschlecht/);
    assert.match(dashboard, /Frauen/);
    const sokoHtml = views.soko();
    assert.match(views.citizens(), /data-grid="citizens"/);
    assert.match(sokoHtml, /data-grid="members"/);
    assert.match(sokoHtml, /class="member-tab-list"/);
    assert.equal((sokoHtml.match(/name="_memberTab"/g) || []).length, 4);
    ["Basis", "Kontakt", "Abrechnung", "Notizen"].forEach(label => assert.match(sokoHtml, new RegExp(`role="tab">${label}<\\/label>`)));
    assert.match(sokoHtml, /member-tab-basic-panel/);
    assert.match(sokoHtml, /member-tab-contact-panel/);
    assert.match(sokoHtml, /member-tab-billing-panel/);
    assert.match(sokoHtml, /member-tab-notes-panel/);
    assert.match(sokoHtml, />Mobiffunk</);
    assert.doesNotMatch(sokoHtml, />Handy</);
    assert.match(sokoHtml, /<div class="field full">\s*<label for="groupId">SOKO<\/label>/);
    ["salutation", "firstName", "lastName", "groupId", "termFrom", "termTo"].forEach(name => assert.match(sokoHtml, new RegExp(`id="${name}" name="${name}"[^>]*required`)));
    assert.match(sokoHtml, />CSV Export<\/button>/);
    assert.doesNotMatch(sokoHtml, /XLSX\/CSV Export/);
    assert.match(sokoHtml, /<div class="member-term-row">[\s\S]*<label for="termFrom">Berufung von<\/label>[\s\S]*<label for="termTo">Berufung bis<\/label>[\s\S]*<\/div>/);
    assert.match(sokoHtml, /<div class="member-bank-row">[\s\S]*<label for="bank">Bankverbindung \/ IBAN<\/label>[\s\S]*<label for="accountHolder">Kontoinhaber<\/label>[\s\S]*<\/div>/);
    assert.ok(sokoHtml.indexOf('member-term-row') < sokoHtml.indexOf('member-bank-row'));
    assert.match(sokoHtml, /button-row member-form-actions/);
    assert.match(views.regions(), /data-grid="streets"/);
    assert.match(views.senders(), /sender-form/);
    assert.match(views.templates(), /template-form/);
    assert.match(views.documents(), /Druckliste/);
    assert.match(views.weddingAnniversaries(), /data-grid="weddingAnniversaries"/);
    assert.match(views.weddingAnniversaries(), /<select name="weddingMonth" data-filter>/);
    assert.match(views.weddingAnniversaries(), /data-action="toggle-all-wedding-anniversaries"/);
    assert.doesNotMatch(views.weddingAnniversaries(), /<span>Anzahl<\/span>/);
    assert.doesNotMatch(views.weddingAnniversaries(), /<span>Gesamt<\/span>/);
    assert.match(views.map(), /id="map-month-select" name="month" data-filter/);
    assert.match(views.map(), /data-action="toggle-map-people"/);
    assert.match(views.import(), /soko-print/);
    assert.match(views.import(), /data-action="download-labo-seed"/);
    assert.match(views.import(), /LABO-Daten herunterladen/);
    assert.match(views.import(), /<select name="month" data-filter>/);
    assert.doesNotMatch(views.import(), /Alte Jubilare löschen/);
    state.importMissingCitizens = [{ id: 'G-missing', firstName: 'Eva', lastName: 'Fehlt', birthDate: '1936-04-06' }];
    assert.doesNotMatch(views.import(), /data-action="delete-missing-citizens"/);
    assert.doesNotMatch(views.import(), /Verschwundene endgültig löschen/);
  });

  it('zeigt bei Hochzeitsjubiläen standardmäßig nur echte Jubiläen, per Toggle auch alle Termine', () => {
    const currentYear = new Date().getFullYear();
    state.filters.weddingMonth = 'alle';
    state.data.weddingAnniversaries = [
      { id: 'WA-golden', citizenId: 'G-1', firstName: 'Erika', lastName: 'Mustermann', weddingDate: `${currentYear - 50}-12-31` },
      { id: 'WA-unrund', citizenId: 'G-2', firstName: 'Eva', lastName: 'Fehlt', weddingDate: `${currentYear - 42}-12-31` }
    ];

    state.showAllWeddingAnniversaries = false;
    assert.match(views.weddingAnniversaries(), /data-grid="weddingAnniversaries"/);
    assert.doesNotMatch(views.weddingAnniversaries(), /checked/);

    state.showAllWeddingAnniversaries = true;
    assert.match(views.weddingAnniversaries(), /checked/);

    state.data.weddingAnniversaries = [{ id: 'WA-unrund', citizenId: 'G-2', firstName: 'Eva', lastName: 'Fehlt', weddingDate: `${currentYear - 42}-12-31` }];
    state.showAllWeddingAnniversaries = false;
    assert.match(views.weddingAnniversaries(), /Keine Hochzeitsjubiläen erfasst/);

    state.showAllWeddingAnniversaries = true;
    assert.match(views.weddingAnniversaries(), /data-grid="weddingAnniversaries"/);
  });

  it('renders receipt, profile and user administration states', () => {
    assert.match(views.quittung(), /Alle fertigen drucken/);
    assert.match(views.quittung(), /<select name="month" data-filter>/);
    assert.match(views.quittungStamm(), /quittung-form/);
    assert.match(views.profile(), /mfa-setup/);
    assert.match(views.users(), /user-form/);

    state.auth.user.mfaEnabled = true;
    assert.match(views.profile(), /mfa-disable-form/);

    state.selectedUserId = 'new';
    assert.match(views.users(), /Startpasswort/);
  });
});
