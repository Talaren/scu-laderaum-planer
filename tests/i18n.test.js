import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const translationsDir = path.resolve(__dirname, "../translations");

function loadCatalog(language) {
  const filePath = path.join(translationsDir, `${language}.js`);
  const code = fs.readFileSync(filePath, "utf8");
  const context = {
    globalThis: null,
    window: null,
    self: null
  };

  context.globalThis = context;
  context.window = context;
  context.self = context;

  vm.runInNewContext(code, context, { filename: filePath });
  return context.SCU_PLANNER_TRANSLATIONS?.[language];
}

test("en- und de-Kataloge sind vorhanden", () => {
  const english = loadCatalog("en");
  const german = loadCatalog("de");

  assert.ok(english);
  assert.ok(german);
  assert.equal(english["app.title"], "SCU Cargo Mission Planner");
  assert.equal(german["app.title"], "SCU-Laderaum-Planer");
});

test("de-Katalog deckt dieselben Schluessel ab wie en", () => {
  const english = loadCatalog("en");
  const german = loadCatalog("de");

  assert.deepEqual(Object.keys(german).sort(), Object.keys(english).sort());
});
