import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/eval.ts", import.meta.url));
const tsxLoader = import.meta.resolve("tsx");

function workspace(t: TestContext): string {
  const directory = mkdtempSync(join(tmpdir(), "llm-check-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function run(directory: string, ...args: string[]) {
  const result = spawnSync(process.execPath, ["--import", tsxLoader, cliPath, ...args], {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  return result;
}

test("normalizes matching outputs and saves the original strings", (t) => {
  const directory = workspace(t);
  const item = { name: "positive", output: " POSITIVE\n", expected: "positive" };
  writeFileSync(join(directory, "cases.json"), JSON.stringify([item]));

  const result = run(directory, "cases.json", "--report", "report.json");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1\/1 passed/);
  assert.deepEqual(JSON.parse(readFileSync(join(directory, "report.json"), "utf8")), {
    total: 1,
    passed: 1,
    failed: 0,
    results: [{ ...item, passed: true }],
  });
});

test("saves failures and returns exit code 1", (t) => {
  const directory = workspace(t);
  const item = { name: "neutral", output: "positive", expected: "neutral" };
  writeFileSync(join(directory, "cases.json"), JSON.stringify([item]));

  const result = run(directory, "cases.json", "--report", "report.json");

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /FAIL neutral/);
  assert.deepEqual(JSON.parse(readFileSync(join(directory, "report.json"), "utf8")), {
    total: 1,
    passed: 0,
    failed: 1,
    results: [{ ...item, passed: false }],
  });
});

test("rejects invalid input with exit code 2", async (t) => {
  const scenarios = [
    { name: "missing file", contents: undefined, message: /case file not found/ },
    { name: "malformed JSON", contents: "[", message: /not valid JSON/ },
    { name: "empty array", contents: "[]", message: /at least one case/ },
    { name: "invalid field", contents: '[{"name":"x","output":1,"expected":"x"}]', message: /string output/ },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, (t) => {
      const directory = workspace(t);
      if (scenario.contents !== undefined) {
        writeFileSync(join(directory, "cases.json"), scenario.contents);
      }

      const result = run(directory, "cases.json");

      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, scenario.message);
    });
  }
});

test("returns exit code 2 when the report cannot be written", (t) => {
  const directory = workspace(t);
  writeFileSync(join(directory, "cases.json"), JSON.stringify([
    { name: "positive", output: "positive", expected: "positive" },
  ]));

  const result = run(directory, "cases.json", "--report", "missing/report.json");

  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /could not write report/);
});
