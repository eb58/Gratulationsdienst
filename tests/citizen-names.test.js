import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { citizenAddressName, citizenDisplayName, citizenFormalName, citizenListName } from '../modules/citizenNames.js';

describe('citizen names with doctoral degree', () => {
  const citizen = { salutation: 'Frau', doctoralDegree: 'Dr.', firstName: 'Erika', lastName: 'Mustermann' };

  it('formats address, salutation and list variants', () => {
    assert.equal(citizenAddressName(citizen), 'Frau Dr. Erika Mustermann');
    assert.equal(citizenDisplayName(citizen), 'Dr. Erika Mustermann');
    assert.equal(citizenFormalName(citizen), 'Frau Dr. Mustermann');
    assert.equal(citizenListName(citizen), 'Mustermann, Dr. Erika');
  });

  it('omits an empty doctoral degree without extra whitespace', () => {
    assert.equal(citizenAddressName({ ...citizen, doctoralDegree: '' }), 'Frau Erika Mustermann');
  });
});
