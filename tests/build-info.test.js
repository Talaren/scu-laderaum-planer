import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildInfoPath = path.resolve(__dirname, "../build-info.js");

test("default-build-info ist vorhanden und neutral", () => {
  const code = fs.readFileSync(buildInfoPath, "utf8");
  const context = {
    globalThis: null,
    window: null,
    self: null
  };

  context.globalThis = context;
  context.window = context;
  context.self = context;

  vm.runInNewContext(code, context, { filename: buildInfoPath });

  assert.equal(context.SCU_PLANNER_BUILD_INFO?.version, "");
  assert.equal(context.SCU_PLANNER_BUILD_INFO?.repositoryUrl, "");
  assert.equal(context.SCU_PLANNER_BUILD_INFO?.repositoryLabel, "");
});
