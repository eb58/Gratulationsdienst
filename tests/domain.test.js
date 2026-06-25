import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  buildSokoGroups,
  buildStreetData,
  districtOptions,
  normalizeStreetDistrict,
  normalizeStreetRules,
  sokoCodesFromDirectory,
  sokoGroupId,
  sokoStreetNames,
  streetDistrictSummary,
  streetGroupDisplay,
  streetGroupSummary,
  streetRangeLabel,
  streetRuleId
} from '../modules/domain.js';

afterEach(() => {
  delete globalThis.SOKO_STRASSENVERZEICHNIS;
});

describe('district helpers', () => {
  it('keeps known and combined district values', () => {
    assert.equal(normalizeStreetDistrict('Tegel'), 'Tegel');
    assert.equal(normalizeStreetDistrict('Tegel / Wittenau'), 'Tegel / Wittenau');
  });

  it('maps empty or unknown district values to the fallback', () => {
    assert.equal(normalizeStreetDistrict(''), 'nicht zugeordnet');
    assert.equal(normalizeStreetDistrict('Unbekannt'), 'nicht zugeordnet');
  });

  it('keeps custom current values available in district options', () => {
    const options = districtOptions('Custom District');
    assert.deepEqual(options[0], ['Custom District', 'Custom District']);
    assert.ok(options.some(([value]) => value === 'Tegel'));
  });
});

describe('SOKO directory helpers', () => {
  it('sorts SOKO codes numerically and removes duplicates', () => {
    globalThis.SOKO_STRASSENVERZEICHNIS = {
      A: [{ soko: '10' }, { soko: '02' }],
      B: [{ soko: '02' }]
    };

    assert.deepEqual(sokoCodesFromDirectory(), ['02', '10']);
  });

  it('formats SOKO ids and finds street names by code', () => {
    globalThis.SOKO_STRASSENVERZEICHNIS = {
      'Straße A': [{ soko: '01' }],
      'Straße B': [{ soko: '02' }, { soko: '01' }]
    };

    assert.equal(sokoGroupId('01'), 'SOKO 01');
    assert.deepEqual(sokoStreetNames('01'), ['Straße A', 'Straße B']);
  });
});

describe('street rule helpers', () => {
  it('creates stable street rule ids', () => {
    assert.equal(streetRuleId(0, 0), 'SR-0001-01');
    assert.equal(streetRuleId(12, 3), 'SR-0013-04');
  });

  it('normalizes street rules with defaults and padded SOKO codes', () => {
    assert.deepEqual(normalizeStreetRules([
      { plz: '13437', district: 'Tegel', soko: '3', von: '1', bis: '9' },
      { id: 'custom', ortsteil: 'Unbekannt', art: 'G' }
    ], 4), [
      { id: 'SR-0005-01', plz: '13437', ortsteil: 'Tegel', soko: '03', von: '1', bis: '9', art: 'F' },
      { id: 'custom', plz: '', ortsteil: 'nicht zugeordnet', soko: '', von: '', bis: '', art: 'G' }
    ]);
  });

  it('summarizes districts and SOKO groups', () => {
    const rules = [
      { ortsteil: 'Tegel', soko: '03' },
      { ortsteil: 'Tegel', soko: '03' },
      { ortsteil: 'Wittenau', soko: '03' }
    ];

    assert.equal(streetDistrictSummary(rules), 'Tegel / Wittenau');
    assert.equal(streetGroupSummary(rules), 'SOKO 03');
    assert.equal(streetGroupSummary([...rules, { ortsteil: 'Frohnau', soko: '04' }]), '');
  });

  it('formats group display and range labels', () => {
    assert.equal(streetGroupDisplay({ rules: [{ soko: '03' }, { soko: '01' }] }), 'SOKO 01, SOKO 03');
    assert.equal(streetGroupDisplay({ groupId: 'SOKO 07', rules: [{ soko: '03' }] }), 'SOKO 07');
    assert.equal(streetGroupDisplay({ rules: [] }), 'offen');
    assert.equal(streetRangeLabel({}), 'alle Hausnummern');
    assert.equal(streetRangeLabel({ von: '10', art: 'G' }), '10-offen G');
    assert.equal(streetRangeLabel({ bis: '20', art: 'U' }), 'ab Anfang-20 U');
  });
});

describe('generated SOKO data', () => {
  it('builds SOKO groups and street data from the directory', () => {
    globalThis.SOKO_STRASSENVERZEICHNIS = {
      'Straße A': [{ plz: '13437', ortsteil: 'Tegel', soko: '01', von: '1', bis: '9', art: 'F' }],
      'Straße B': [{ plz: '13439', ortsteil: 'Wittenau', soko: '02' }]
    };

    assert.deepEqual(buildSokoGroups().map(group => [group.id, group.name]), [
      ['SOKO 01', 'SOKO 01'],
      ['SOKO 02', 'SOKO 02']
    ]);

    assert.deepEqual(buildStreetData().map(street => ({
      id: street.id,
      name: street.name,
      district: street.district,
      groupId: street.groupId
    })), [
      { id: 'STR-0001', name: 'Straße A', district: 'Tegel', groupId: 'SOKO 01' },
      { id: 'STR-0002', name: 'Straße B', district: 'Wittenau', groupId: 'SOKO 02' }
    ]);
  });
});
