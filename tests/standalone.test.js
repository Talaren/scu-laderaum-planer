import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

test("index.html bindet Build-Info und Standalone-Skripte in der erwarteten Reihenfolge ein", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

  const buildInfoIndex = html.indexOf('<script src="./build-info.js"></script>');
  const englishIndex = html.indexOf('<script src="./translations/en.js"></script>');
  const germanIndex = html.indexOf('<script src="./translations/de.js"></script>');
  const appIndex = html.indexOf('<script src="./app-standalone.js"></script>');

  assert.ok(buildInfoIndex >= 0);
  assert.ok(englishIndex > buildInfoIndex);
  assert.ok(germanIndex > englishIndex);
  assert.ok(appIndex > germanIndex);
  assert.match(html, /<meta name="referrer" content="no-referrer">/u);
});

test("Beispielkonfigurationen fuer nginx und Caddy sind vorhanden", () => {
  assert.ok(fs.existsSync(path.join(rootDir, "deploy/nginx.conf")));
  assert.ok(fs.existsSync(path.join(rootDir, "deploy/Caddyfile")));
});

test("Traefik-Deployment-Dateien sind vorhanden", () => {
  assert.ok(fs.existsSync(path.join(rootDir, "deploy/traefik/docker-compose.yml")));
  assert.ok(fs.existsSync(path.join(rootDir, "deploy/traefik/nginx-site.conf")));
  assert.ok(fs.existsSync(path.join(rootDir, "deploy/traefik/update-release.sh")));
  assert.ok(fs.existsSync(path.join(rootDir, "deploy/traefik/deploy-latest.sh")));
});
