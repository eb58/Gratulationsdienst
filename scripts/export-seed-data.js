const fs = require("fs");
const vm = require("vm");

const appFile = "app.js";
const streetsFile = "data/soko-strassenverzeichnis.js";
const targetFile = process.argv[2] || ".tmp-seed-data.json";
const window = {};
const context = vm.createContext({
  window,
  TextDecoder,
  structuredClone,
  Intl,
  Date,
  console
});
const streetsScript = fs.readFileSync(streetsFile, "utf8");
const appScript = fs.readFileSync(appFile, "utf8");
const dataOnlyScript = appScript.slice(0, appScript.indexOf("const state ="));

vm.runInContext(streetsScript, context, { filename: streetsFile });
vm.runInContext(`${dataOnlyScript}\nglobalThis.__seedData = sampleData;`, context, { filename: appFile });

fs.writeFileSync(targetFile, JSON.stringify(context.__seedData, null, 2), "utf8");
console.log(JSON.stringify({
  file: targetFile,
  citizens: context.__seedData.citizens.length,
  sokoGroups: context.__seedData.sokoGroups.length,
  sokoMembers: context.__seedData.sokoMembers.length,
  streets: context.__seedData.streets.length,
  senders: context.__seedData.senders.length,
  templates: context.__seedData.templates.length,
  importLog: context.__seedData.importLog.length
}, null, 2));
