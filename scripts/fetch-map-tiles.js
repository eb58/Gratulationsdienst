import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Laedt die OSM-Hintergrundkacheln fuer die Strassenkarte einmalig als statische Dateien.
// Aufruf: node scripts/fetch-map-tiles.js
// Grund: streetMapSvg() rendert immer denselben festen Kartenausschnitt bei festem Zoom (siehe
// modules/map.js), es gibt also nur eine kleine, feste Kachelmenge. Direktes Verlinken auf
// tile.openstreetmap.org bei jedem Seitenaufruf verstoesst gegen die OSM Tile Usage Policy
// (kein produktives Hotlinking ohne eigenen Server/Key) und fuehrt zu 404s. Ein einmaliger
// lokaler Snapshot ist policy-konform und macht die Karte unabhaengig vom OSM-Tile-Server.
const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const geometriesFile = path.join(rootDir, "public/data/osm-reinickendorf-street-geometries.js");
const targetDir = path.join(rootDir, "public/data/tiles");
// Zoom 13 hatte beim Erstellen dieses Skripts eine grossflaechige Renderluecke bei OSM (viele
// 404s in genau diesem Kartenausschnitt, waehrend Zoom 12 und 14 problemlos liefern) -> 14 gewaehlt.
const zoom = 14;

const readBbox = () => {
  const content = fs.readFileSync(geometriesFile, "utf8");
  const match = content.match(/"bbox":\s*\[\s*([\d.,\s-]+?)\s*\]/);
  if (!match) throw new Error(`bbox nicht gefunden in ${geometriesFile}`);
  return match[1].split(",").map(Number);
};

const lonLatToWorld = ([lon, lat]) => {
  const scale = 256 * 2 ** zoom;
  const sinLat = Math.sin(lat * Math.PI / 180);
  return [
    (lon + 180) / 360 * scale,
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  ];
};

const tileRange = bbox => {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const minWorld = lonLatToWorld([minLon, maxLat]);
  const maxWorld = lonLatToWorld([maxLon, minLat]);
  return {
    minX: Math.floor(minWorld[0] / 256),
    maxX: Math.floor(maxWorld[0] / 256),
    minY: Math.floor(minWorld[1] / 256),
    maxY: Math.floor(maxWorld[1] / 256)
  };
};

const fetchTile = async (x, y) => {
  const response = await fetch(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, {
    headers: { "User-Agent": "Gratulationsdienst-Reinickendorf/1.0 (einmaliger lokaler Kachel-Snapshot)" }
  });
  if (!response.ok) throw new Error(`Kachel ${zoom}/${x}/${y} -> HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

const { minX, maxX, minY, maxY } = tileRange(readBbox());
const dir = path.join(targetDir, String(zoom));
fs.mkdirSync(dir, { recursive: true });

const xs = Array.from({ length: maxX - minX + 1 }, (_, i) => minX + i);
const ys = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);
let ok = 0, failed = 0;

for (const x of xs) {
  const xDir = path.join(dir, String(x));
  fs.mkdirSync(xDir, { recursive: true });
  for (const y of ys) {
    try {
      const png = await fetchTile(x, y);
      fs.writeFileSync(path.join(xDir, `${y}.png`), png);
      ok += 1;
      console.log(`OK   ${zoom}/${x}/${y}`);
    } catch (error) {
      failed += 1;
      console.warn(`FEHLT ${zoom}/${x}/${y}: ${error.message}`);
    }
  }
}

console.log(JSON.stringify({ zoom, minX, maxX, minY, maxY, total: xs.length * ys.length, ok, failed }, null, 2));
if (failed) process.exitCode = 1;
