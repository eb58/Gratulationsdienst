import { escapeHtml } from './utils.js';
import { sokoGroupId, sokoColors } from './domain.js';
import { state } from './state.js';
import { normalizeStreetName } from './assignment.js';
import { loadScript } from './scriptLoader.js';

export const mapDataLoaded = () => Boolean(globalThis.REINICKENDORF_STREET_GEOMETRIES && globalThis.REINICKENDORF_ADDRESS_POINTS);
let mapDataPromise = null;
export const ensureMapData = () => mapDataPromise ||= Promise.all([
  loadScript(`${import.meta.env?.BASE_URL ?? "/"}data/reinickendorf-street-geometries.js`),
  loadScript(`${import.meta.env?.BASE_URL ?? "/"}data/reinickendorf-address-points.js`)
]);

export const mapData = () => globalThis.REINICKENDORF_STREET_GEOMETRIES || { bbox: [], segments: [] };
export const addressPointData = () => globalThis.REINICKENDORF_ADDRESS_POINTS || { addresses: [] };
export const assignedAddressPoints = () => (addressPointData().addresses || []).filter(address => address.soko);
export const addressGroupId = address => address.soko ? sokoGroupId(address.soko) : "offen";
export const realAddressCandidates = () => assignedAddressPoints().filter(address => address.street && address.houseNumber && address.postalCode);

export const mapStreetLookup = () => state.data.streets.reduce((lookup, street) => {
  lookup[normalizeStreetName(street.name)] = street;
  return lookup;
}, {});
const tokenBoundary = /[\s/(),-]/;
const tokenIncludes = (haystack, needle) => {
  const index = haystack.indexOf(needle);
  return index >= 0
    && (index === 0 || tokenBoundary.test(haystack[index - 1]))
    && (index + needle.length === haystack.length || tokenBoundary.test(haystack[index + needle.length]));
};
export const mapStreetByName = (name, lookup = mapStreetLookup()) => {
  const key = normalizeStreetName(name);
  return lookup[key]
    || state.data.streets.find(street => tokenIncludes(normalizeStreetName(street.name), key) || tokenIncludes(key, normalizeStreetName(street.name)));
};
export const mapStreetAddressPoints = () => (addressPointData().addresses || []).reduce((index, address) => {
  if (!address.soko || !Number.isFinite(address.lon) || !Number.isFinite(address.lat)) return index;
  const key = normalizeStreetName(address.street);
  index[key] ||= [];
  index[key].push(address);
  return index;
}, {});
const squaredDistance = (lon, lat, address) => (address.lon - lon) ** 2 + (address.lat - lat) ** 2;
const nearestAddressSoko = (coords, candidates) => coords.reduce((best, [lon, lat]) => candidates.reduce((closest, address) => {
  const dist = squaredDistance(lon, lat, address);
  return dist < closest.dist ? { dist, soko: address.soko } : closest;
}, best), { dist: Infinity, soko: null }).soko;
export const mapNamedSegmentPoints = (segments = mapData().segments || [], lookup = mapStreetLookup()) => segments.reduce((index, segment) => {
  if (segment.matchSource === 'nearby') return index;
  const street = mapStreetByName(segment.name, lookup);
  const key = normalizeStreetName(street?.name || segment.name);
  index[key] ||= [];
  index[key].push(...segment.coords);
  return index;
}, {});
const NEARBY_TRUST_DEGREES_SQUARED = 0.0015 ** 2;
// Unbenannte Wege (z.B. Wirtschaftswege) werden bei der Datengenerierung per reiner Naehe einem
// Strassennamen zugeordnet ("nearby"). Ohne einen echten, tatsaechlich in der Umgebung liegenden
// Abschnitt derselben Strasse ist diese Zuordnung nicht vertrauenswuerdig genug zum Einfaerben.
const nearbyGuessIsTrustworthy = (segment, street, namedPoints) => {
  const points = namedPoints[normalizeStreetName(street?.name || segment.name)];
  return Boolean(points?.length) && segment.coords.some(([lon, lat]) =>
    points.some(([nlon, nlat]) => (nlon - lon) ** 2 + (nlat - lat) ** 2 < NEARBY_TRUST_DEGREES_SQUARED));
};
export const mapSegmentGroupIds = (segment, lookup = mapStreetLookup(), addressIndex = mapStreetAddressPoints(), namedPoints = mapNamedSegmentPoints(undefined, lookup)) => {
  const street = mapStreetByName(segment.name, lookup);
  if (segment.matchSource === 'nearby' && !nearbyGuessIsTrustworthy(segment, street, namedPoints)) return ["offen"];
  const groups = [...new Set((street?.rules || []).map(rule => rule.soko).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  if (groups.length > 1 && street?.name) {
    const candidates = addressIndex[normalizeStreetName(street.name)];
    const nearestSoko = candidates?.length && nearestAddressSoko(segment.coords, candidates);
    if (nearestSoko && groups.includes(nearestSoko)) return [sokoGroupId(nearestSoko)];
  }
  return groups.length ? groups.map(sokoGroupId) : ["offen"];
};
export const mapSegments = () => {
  const lookup = mapStreetLookup();
  const addressIndex = mapStreetAddressPoints();
  const rawSegments = mapData().segments || [];
  const namedPoints = mapNamedSegmentPoints(rawSegments, lookup);
  return rawSegments
    .map(segment => ({ ...segment, groupIds: mapSegmentGroupIds(segment, lookup, addressIndex, namedPoints) }))
    .filter(segment => segment.matchSource !== 'nearby' || segment.groupIds[0] !== 'offen');
};
export const mapSegmentCounts = () => mapSegments().reduce((counts, segment) => {
  segment.groupIds.forEach(groupId => { counts[groupId] = (counts[groupId] || 0) + 1; });
  return counts;
}, {});

export const lonLatToWorld = ([lon, lat], zoom) => {
  const scale = 256 * 2 ** zoom;
  const sinLat = Math.sin(lat * Math.PI / 180);
  return [
    (lon + 180) / 360 * scale,
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  ];
};
export const mapViewport = (bbox, width, height, padding, zoom = 13) => {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const topLeft = lonLatToWorld([minLon, maxLat], zoom);
  const bottomRight = lonLatToWorld([maxLon, minLat], zoom);
  const scale = Math.min((width - padding * 2) / (bottomRight[0] - topLeft[0]), (height - padding * 2) / (bottomRight[1] - topLeft[1]));
  const xOffset = (width - (bottomRight[0] - topLeft[0]) * scale) / 2;
  const yOffset = (height - (bottomRight[1] - topLeft[1]) * scale) / 2;
  return { zoom, scale, topLeft, xOffset, yOffset };
};
export const mapProject = (coord, viewport) => {
  const world = lonLatToWorld(coord, viewport.zoom);
  return [
    viewport.xOffset + (world[0] - viewport.topLeft[0]) * viewport.scale,
    viewport.yOffset + (world[1] - viewport.topLeft[1]) * viewport.scale
  ];
};
export const mapTileImages = (bbox, viewport) => {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const minWorld = lonLatToWorld([minLon, maxLat], viewport.zoom);
  const maxWorld = lonLatToWorld([maxLon, minLat], viewport.zoom);
  const minX = Math.floor(minWorld[0] / 256);
  const maxX = Math.floor(maxWorld[0] / 256);
  const minY = Math.floor(minWorld[1] / 256);
  const maxY = Math.floor(maxWorld[1] / 256);
  return Array.from({ length: maxX - minX + 1 }, (_, xIndex) => minX + xIndex).flatMap(tileX =>
    Array.from({ length: maxY - minY + 1 }, (_, yIndex) => {
      const tileY = minY + yIndex;
      const x = viewport.xOffset + (tileX * 256 - viewport.topLeft[0]) * viewport.scale;
      const y = viewport.yOffset + (tileY * 256 - viewport.topLeft[1]) * viewport.scale;
      const size = 256 * viewport.scale;
      return `<image class="map-tile" href="https://tile.openstreetmap.org/${viewport.zoom}/${tileX}/${tileY}.png" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}"></image>`;
    })
  ).join("");
};
export const mapPath = (coords, project) => coords.map((coord, index) => {
  const [x, y] = project(coord);
  return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(" ");
export const mapStreetPathGroups = (segments, project) => {
  const groups = {};
  segments.forEach(segment => {
    const path = mapPath(segment.coords, project);
    segment.groupIds.forEach((groupId, index) => {
      const key = `${groupId}|${segment.name}|${index}`;
      groups[key] = groups[key] || { groupId, streetName: segment.name, dashIndex: index, dashCount: segment.groupIds.length, paths: [], count: 0 };
      groups[key].paths.push(path);
      groups[key].count += 1;
    });
  });
  return Object.values(groups);
};
export const mapStreetPathsSvg = (segments, project) => mapStreetPathGroups(segments, project).filter(group => group.groupId !== "offen").map(group => {
  const d = group.paths.join(" ");
  // Jede SOKO bekommt einen gleich langen, ueberlappungsfreien Abschnitt des Dash-Musters
  const dash = group.dashCount > 1 ? `stroke-dasharray="10 ${10 * (group.dashCount - 1)}" stroke-dashoffset="${-10 * group.dashIndex}"` : "";
  return `
  <g class="map-street-group" data-group-id="${escapeHtml(group.groupId)}" data-street-name="${escapeHtml(group.streetName || '')}">
    <path class="map-street-hit" d="${d}"></path>
    <path class="map-street-line" d="${d}" style="stroke:${escapeHtml(sokoColors[group.groupId] || sokoColors.offen)}" ${dash}></path>
  </g>`;
}).join("");
const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
export const mapSokoLabelPositions = (segments, project) => {
  const points = {};
  segments.forEach(segment => segment.groupIds.forEach(groupId => {
    if (groupId === "offen") return;
    points[groupId] ||= [];
    points[groupId].push(...segment.coords.map(project));
  }));
  return Object.entries(points).map(([groupId, groupPoints]) => {
    const center = [median(groupPoints.map(([x]) => x)), median(groupPoints.map(([, y]) => y))];
    const distance = ([x, y]) => (x - center[0]) ** 2 + (y - center[1]) ** 2;
    const [x, y] = groupPoints.reduce((best, point) => distance(point) < distance(best) ? point : best);
    return { groupId, x, y };
  });
};
export const mapSokoLabelsSvg = (segments, project) => mapSokoLabelPositions(segments, project).map(({ groupId, x, y }) => `
  <g class="map-soko-label" data-group-id="${escapeHtml(groupId)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
    <circle r="11"></circle>
    <text dy="0.35em">${escapeHtml(groupId.replace(/\D/g, ""))}</text>
  </g>`).join("");
export const mapAddressPointGroups = () => {
  const groups = {};
  assignedAddressPoints().forEach(address => {
    const groupId = addressGroupId(address);
    groups[groupId] = groups[groupId] || [];
    groups[groupId].push(address);
  });
  return groups;
};
// Räumliches Grid statt Vollscan: bei ~41.000 Adresspunkten würde jede Mausbewegung sonst
// eine lineare Distanzberechnung über alle Punkte auslösen.
const HIT_CELL_SIZE = 24;
const addressHitCellKey = (x, y) => `${Math.floor(x / HIT_CELL_SIZE)}:${Math.floor(y / HIT_CELL_SIZE)}`;
let addressHitGrid = new Map();
const addToHitGrid = point => {
  const key = addressHitCellKey(point.x, point.y);
  (addressHitGrid.get(key) || addressHitGrid.set(key, []).get(key)).push(point);
};
export const findNearestAddress = (x, y, maxDist) => {
  let best = null, bestDist = maxDist * maxDist;
  const range = Math.ceil(maxDist / HIT_CELL_SIZE);
  const [cx, cy] = [Math.floor(x / HIT_CELL_SIZE), Math.floor(y / HIT_CELL_SIZE)];
  for (let dx = -range; dx <= range; dx++) for (let dy = -range; dy <= range; dy++) {
    addressHitGrid.get(`${cx + dx}:${cy + dy}`)?.forEach(point => {
      const dist = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (dist < bestDist) { bestDist = dist; best = point; }
    });
  }
  return best;
};
export const mapAddressPointsSvg = project => {
  addressHitGrid = new Map();
  return Object.entries(mapAddressPointGroups()).map(([groupId, addresses]) => {
    const d = addresses.map(address => {
      const [x, y] = project([address.lon, address.lat]);
      addToHitGrid({ x, y, groupId, label: `${address.street} ${address.houseNumber || ""}`.trim() });
      return `M${(x - 1.3).toFixed(1)} ${(y - 1.3).toFixed(1)}h2.6v2.6h-2.6z`;
    }).join("");
    return `<path class="map-address-point-group" data-group-id="${escapeHtml(groupId)}" d="${d}" style="fill:${escapeHtml(sokoColors[groupId] || sokoColors.offen)}"></path>`;
  }).join("");
};
export const streetMapSvg = () => {
  const data = mapData();
  if (!data.bbox.length) return `<div class="empty-state">Keine Kartendaten geladen</div>`;
  const padding = 28;
  const zoom = 13;
  const [minLon, minLat, maxLon, maxLat] = data.bbox;
  const tl = lonLatToWorld([minLon, maxLat], zoom);
  const br = lonLatToWorld([maxLon, minLat], zoom);
  const width = 1520;
  const height = Math.round((br[1] - tl[1]) / (br[0] - tl[0]) * (width - 2 * padding) + 2 * padding);
  const viewport = mapViewport(data.bbox, width, height, padding, zoom);
  const project = coord => mapProject(coord, viewport);
  const segments = mapSegments();
  return `
    <svg class="street-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="Straßenkarte Reinickendorf nach SOKO-Zuständigkeit">
      <rect class="map-background" width="${width}" height="${height}" rx="0"></rect>
      <g class="map-tiles">${mapTileImages(data.bbox, viewport)}</g>
      <g class="map-streets">${mapStreetPathsSvg(segments, project)}</g>
      <g class="map-address-points">${mapAddressPointsSvg(project)}</g>
      <g class="map-soko-labels">${mapSokoLabelsSvg(segments, project)}</g>
    </svg>
  `;
};
