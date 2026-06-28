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
  state.filters = { q: '', month: '06', groupId: 'alle', age: 'alle', status: 'alle', occasion: 'Geburtstag' };
  state.mapMonth = '06';
  state.quittungMonat = '06';
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
  state.importText = 'Vorname;Nachname';
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
    assert.match(html, /Kein Fragebogen eingelesen/);
    assert.doesNotMatch(html, /citizen-questionnaire-image/);
  });

  it('renders map info for empty and assigned SOKO selections', () => {
    assert.match(sokoMapInfoHtml('offen'), /Über eine SOKO/);

    const html = sokoMapInfoHtml('SOKO 01', 'Teststraße');
    assert.match(html, /Teststraße/);
    assert.match(html, /Lea Leitung/);
    assert.match(html, /Erika Mustermann/);
    assert.match(html, /1 Adressen/);
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
    assert.match(views.citizens(), /data-grid="citizens"/);
    assert.match(views.soko(), /data-grid="members"/);
    assert.match(views.regions(), /data-grid="streets"/);
    assert.match(views.senders(), /sender-form/);
    assert.match(views.templates(), /template-form/);
    assert.match(views.documents(), /Druckliste/);
    assert.match(views.import(), /soko-print/);
  });

  it('renders receipt, profile and user administration states', () => {
    assert.match(views.quittung(), /Alle fertigen drucken/);
    assert.match(views.quittungStamm(), /quittung-form/);
    assert.match(views.profile(), /mfa-setup/);
    assert.match(views.users(), /user-form/);

    state.auth.user.mfaEnabled = true;
    assert.match(views.profile(), /mfa-disable-form/);

    state.selectedUserId = 'new';
    assert.match(views.users(), /Startpasswort/);
  });
});
