const fs = require("fs");
const path = require("path");
const { findeSoko } = require("../data/soko-strassenverzeichnis.js");

const targetFile = process.argv[2] || "data/reinickendorf-address-points.js";
const overpassUrl = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const query = `
[out:json][timeout:180];
area["name"="Reinickendorf"]["boundary"="administrative"]["admin_level"="9"]->.searchArea;
(
  node(area.searchArea)["addr:housenumber"]["addr:street"];
  way(area.searchArea)["addr:housenumber"]["addr:street"];
  relation(area.searchArea)["addr:housenumber"]["addr:street"];
);
out center tags;
`;

const compactNumber = value => String(value ?? "").trim().replace(/\s+/g, "");
const assignmentFor = address => {
  try {
    const result = findeSoko(address.street, address.houseNumber, address.postalCode);
    return { soko: result.soko, district: result.ortsteil, normalizedStreet: result.strasse };
  } catch (error) {
    return { soko: "", district: address.district || "", normalizedStreet: address.street, error: error.message };
  }
};
const elementCenter = element => element.type === "node"
  ? { lat: element.lat, lon: element.lon }
  : { lat: element.center?.lat, lon: element.center?.lon };
const addressFromElement = element => {
  const tags = element.tags || {};
  const center = elementCenter(element);
  const houseNumber = compactNumber(tags["addr:housenumber"]);
  if (!center.lat || !center.lon || !tags["addr:street"] || !houseNumber) return null;
  const base = {
    id: `${element.type}/${element.id}`,
    street: tags["addr:street"],
    houseNumber,
    postalCode: tags["addr:postcode"] || "",
    district: tags["addr:suburb"] || tags["addr:district"] || "",
    lat: Number(center.lat.toFixed(7)),
    lon: Number(center.lon.toFixed(7))
  };
  const assignment = assignmentFor(base);
  return {
    ...base,
    street: assignment.normalizedStreet || base.street,
    district: assignment.district || base.district,
    soko: assignment.soko,
    ...(assignment.error ? { assignmentError: assignment.error } : {})
  };
};
const sortAddress = (a, b) =>
  a.street.localeCompare(b.street, "de")
  || Number.parseInt(a.houseNumber, 10) - Number.parseInt(b.houseNumber, 10)
  || a.houseNumber.localeCompare(b.houseNumber, "de");
const fetchOverpass = () => fetch(overpassUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Gratulationsdienst-Reinickendorf/1.0"
  },
  body: new URLSearchParams({ data: query })
}).then(response => response.ok ? response.json() : response.text().then(text => Promise.reject(new Error(`Overpass ${response.status}: ${text.slice(0, 500)}`))));

fetchOverpass().then(data => {
  const addresses = (data.elements || [])
    .map(addressFromElement)
    .filter(Boolean)
    .sort(sortAddress);
  const unique = [...new Map(addresses.map(address => [`${address.street}|${address.houseNumber}|${address.postalCode}|${address.lat}|${address.lon}`, address])).values()];
  const payload = {
    source: "OpenStreetMap Overpass API",
    sourceUrl: overpassUrl,
    generatedAt: new Date().toISOString(),
    query: query.trim(),
    addresses: unique
  };
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, `window.REINICKENDORF_ADDRESS_POINTS = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
  const assigned = unique.filter(address => address.soko).length;
  console.log(JSON.stringify({
    targetFile,
    addresses: unique.length,
    assigned,
    unassigned: unique.length - assigned
  }, null, 2));
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
