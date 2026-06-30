import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  numOr, lo, hi, parityOf, plzCompatible, parityOverlap,
  hasNumberInRange, rangeLabel, directoryConflicts
} from '../scripts/check-directory.js';

describe('Hausnummern-Grenzen', () => {
  it('zieht die Zahl aus dem Wert, sonst Fallback', () => {
    assert.equal(numOr('17a', 1), 17);
    assert.equal(numOr('', 1), 1);
    assert.equal(numOr(undefined, Infinity), Infinity);
  });

  it('lo/hi nutzen von/bis mit Default 1 bzw. Infinity', () => {
    assert.equal(lo({ von: '5' }), 5);
    assert.equal(lo({}), 1);
    assert.equal(hi({ bis: '40' }), 40);
    assert.equal(hi({}), Infinity);
  });
});

describe('Paritaet', () => {
  it('G=gerade, U=ungerade, sonst alle', () => {
    assert.equal(parityOf('G'), 'even');
    assert.equal(parityOf('U'), 'odd');
    assert.equal(parityOf(''), 'all');
  });

  it('parityOverlap: all gegen alles, gleiche Seite, sonst null', () => {
    assert.equal(parityOverlap({ art: '' }, { art: 'G' }), 'even');
    assert.equal(parityOverlap({ art: 'U' }, { art: '' }), 'odd');
    assert.equal(parityOverlap({ art: 'G' }, { art: 'G' }), 'even');
    assert.equal(parityOverlap({ art: 'G' }, { art: 'U' }), null);
  });
});

describe('plzCompatible', () => {
  it('vertraegt fehlende PLZ als Wildcard, sonst Gleichheit', () => {
    assert.equal(plzCompatible({ plz: '13407' }, { plz: '13407' }), true);
    assert.equal(plzCompatible({ plz: '13407' }, { plz: '13409' }), false);
    assert.equal(plzCompatible({}, { plz: '13409' }), true);
  });
});

describe('hasNumberInRange', () => {
  it('false bei leerem Bereich', () => assert.equal(hasNumberInRange(10, 4, 'all'), false));
  it('all immer true bei gueltigem Bereich', () => assert.equal(hasNumberInRange(4, 10, 'all'), true));
  it('findet gerade Zahl im Bereich', () => assert.equal(hasNumberInRange(3, 4, 'even'), true));
  it('keine gerade Zahl zwischen 3 und 3', () => assert.equal(hasNumberInRange(3, 3, 'even'), false));
  it('findet ungerade Zahl', () => assert.equal(hasNumberInRange(2, 3, 'odd'), true));
});

describe('rangeLabel', () => {
  it('formatiert offene, Punkt- und Spannen-Bereiche', () => {
    assert.equal(rangeLabel(5, Infinity), 'ab 5');
    assert.equal(rangeLabel(7, 7), '7');
    assert.equal(rangeLabel(4, 10), '4-10');
  });
});

describe('directoryConflicts', () => {
  it('meldet ueberlappende Hausnummern verschiedener SOKO', () => {
    const result = directoryConflicts({
      Musterstr: [
        { soko: 1, von: '1', bis: '20', art: '', plz: '13407' },
        { soko: 2, von: '10', bis: '30', art: '', plz: '13407' }
      ]
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].street, 'Musterstr');
    assert.equal(result[0].issues.length, 1);
    assert.match(result[0].issues[0], /SOKO 1 vs 2/);
    assert.match(result[0].issues[0], /10-20/);
  });

  it('ignoriert Ueberlappung bei entgegengesetzter Paritaet', () => {
    const result = directoryConflicts({
      Musterstr: [
        { soko: 1, von: '1', bis: '40', art: 'G', plz: '13407' },
        { soko: 2, von: '1', bis: '40', art: 'U', plz: '13407' }
      ]
    });
    assert.deepEqual(result, []);
  });

  it('ignoriert verschiedene PLZ trotz gleicher Hausnummern', () => {
    const result = directoryConflicts({
      Musterstr: [
        { soko: 1, von: '1', bis: '40', art: '', plz: '13407' },
        { soko: 2, von: '1', bis: '40', art: '', plz: '13409' }
      ]
    });
    assert.deepEqual(result, []);
  });

  it('ignoriert gleiche SOKO auf derselben Strasse', () => {
    const result = directoryConflicts({
      Musterstr: [
        { soko: 1, von: '1', bis: '20', art: '', plz: '13407' },
        { soko: 1, von: '10', bis: '30', art: '', plz: '13407' }
      ]
    });
    assert.deepEqual(result, []);
  });

  it('erkennt Konflikt bei gerader Ueberlappung trotz unterschiedlicher Grenzen', () => {
    const result = directoryConflicts({
      Musterstr: [
        { soko: 1, von: '2', bis: '8', art: 'G', plz: '13407' },
        { soko: 2, von: '6', bis: '12', art: '', plz: '13407' }
      ]
    });
    assert.equal(result.length, 1);
    assert.match(result[0].issues[0], /\(gerade\)/);
  });
});
