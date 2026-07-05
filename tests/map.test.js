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

const map = await import('../modules/map.js');
const { state } = await import('../modules/state.js');

const {
  addressGroupId,
  assignedAddressPoints,
  findNearestAddress,
  lonLatToWorld,
  mapAddressPointGroups,
  mapAddressPointsSvg,
  mapPath,
  mapProject,
  mapSegmentCounts,
  mapSegmentGroupIds,
  mapSokoLabelPositions,
  mapSokoLabelsSvg,
  mapStreetByName,
  mapStreetPathGroups,
  mapViewport,
  realAddressCandidates
} = map;

beforeEach(() => {
  state.data.streets = [
    { name: 'Musterstraße', rules: [{ soko: '01' }] },
    { name: 'Nebenstraße (privat)', rules: [{ soko: '02' }, { soko: '03' }] }
  ];
  globalThis.REINICKENDORF_ADDRESS_POINTS = {
    addresses: [
      { street: 'Musterstraße', houseNumber: '1', postalCode: '13437', soko: '01', lon: 13, lat: 52 },
      { street: 'Ohne SOKO', houseNumber: '2', postalCode: '13437', lon: 13.1, lat: 52.1 },
      { street: 'Unvollständig', soko: '02', lon: 13.2, lat: 52.2 }
    ]
  };
  globalThis.REINICKENDORF_STREET_GEOMETRIES = {
    bbox: [13, 52, 13.1, 52.1],
    segments: [
      { name: 'Musterstraße', coords: [[13, 52], [13.1, 52.1]] },
      { name: 'Unbekannt', coords: [[13, 52], [13.1, 52.1]], matchSource: 'nearby' }
    ]
  };
});

describe('map address helpers', () => {
  it('groups assigned real address points by SOKO', () => {
    assert.equal(addressGroupId({ soko: '01' }), 'SOKO 01');
    assert.equal(addressGroupId({}), 'offen');
    assert.equal(assignedAddressPoints().length, 2);
    assert.deepEqual(realAddressCandidates().map(address => address.street), ['Musterstraße']);
    assert.equal(mapAddressPointGroups()['SOKO 01'].length, 1);
  });

  it('builds address point SVG and nearest-address hit data', () => {
    const svg = mapAddressPointsSvg(([lon, lat]) => [lon, lat]);
    assert.match(svg, /data-group-id="SOKO 01"/);
    assert.equal(findNearestAddress(13, 52, 1)?.label, 'Musterstraße 1');
  });
});

describe('map street helpers', () => {
  it('finds streets by variant names and resolves segment groups', () => {
    assert.equal(mapStreetByName('Nebenstraße')?.name, 'Nebenstraße (privat)');
    assert.deepEqual(mapSegmentGroupIds({ name: 'Nebenstr.' }), ['SOKO 02', 'SOKO 03']);
    assert.deepEqual(mapSegmentGroupIds({ name: 'Unbekannt' }), ['offen']);
  });

  it('counts only mapped or directly matched map segments', () => {
    assert.deepEqual(mapSegmentCounts(), { 'SOKO 01': 1 });
  });
});

describe('map projection helpers', () => {
  it('converts lon/lat to world coordinates at zoom 0', () => {
    assert.deepEqual(lonLatToWorld([0, 0], 0).map(value => Math.round(value)), [128, 128]);
  });

  it('projects coordinates and creates SVG paths', () => {
    const viewport = mapViewport([0, 0, 1, 1], 100, 100, 10, 0);
    const projected = mapProject([0.5, 0.5], viewport);
    assert.equal(projected.length, 2);
    assert.equal(mapPath([[0, 0], [1, 1]], ([x, y]) => [x * 10, y * 10]), 'M0.0 0.0 L10.0 10.0');
  });

  it('groups paths per SOKO and dashed split', () => {
    const groups = mapStreetPathGroups([
      { name: 'Musterstraße', groupIds: ['SOKO 01'], coords: [[0, 0], [1, 1]] },
      { name: 'Nebenstraße', groupIds: ['SOKO 02', 'SOKO 03'], coords: [[0, 0], [1, 0]] }
    ], ([x, y]) => [x, y]);

    assert.equal(groups.length, 3);
    assert.ok(groups.some(group => group.groupId === 'SOKO 03' && group.dash === '6'));
  });

  it('places SOKO labels on a street point near the median of their segments', () => {
    const segments = [
      { name: 'Musterstraße', groupIds: ['SOKO 01'], coords: [[0, 0], [2, 1], [100, 1]] },
      { name: 'Musterweg', groupIds: ['SOKO 01'], coords: [[2, 3], [2, 5]] },
      { name: 'Unbekannt', groupIds: ['offen'], coords: [[9, 9], [9, 9]] }
    ];
    assert.deepEqual(mapSokoLabelPositions(segments, ([x, y]) => [x, y]), [{ groupId: 'SOKO 01', x: 2, y: 1 }]);
    const svg = mapSokoLabelsSvg(segments, ([x, y]) => [x, y]);
    assert.match(svg, /data-group-id="SOKO 01"/);
    assert.match(svg, /translate\(2\.0 1\.0\)/);
    assert.match(svg, /<text dy="0.35em">01<\/text>/);
  });
});
