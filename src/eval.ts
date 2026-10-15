import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

type EvalCase = {
  name: string;
  output: string;
  expected: string;
};

type EvalResult = EvalCase & { passed: boolean };

type EvalReport = {
  total: number;
  passed: number;
  failed: number;
  results: EvalResult[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(
  item: Record<string, unknown>,
  field: keyof EvalCase,
  index: number,
): string {
  const value = item[field];

  if (typeof value !== "string") {
    throw new Error(`case at index ${index} must have a string ${field}`);
  }

  return value;
}

function parseCases(data: unknown): EvalCase[] {
  if (!Array.isArray(data)) {
    throw new Error("case file must contain an array");
  }

  if (data.length === 0) {
    throw new Error("case file must contain at least one case");
  }

  return data.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`case at index ${index} must be an object`);
    }

    return {
      name: readStringField(item, "name", index),
      output: readStringField(item, "output", index),
      expected: readStringField(item, "expected", index),
    };
  });
}

async function loadCases(path: string): Promise<EvalCase[]> {
  let fileContents: string;

  try {
    fileContents = await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`case file not found: ${path}`);
    }

    throw new Error(
      `could not read case file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    return parseCases(JSON.parse(fileContents) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`case file is not valid JSON: ${error.message}`);
    }

    throw error;
  }
}

function evaluate(cases: EvalCase[]): EvalReport {
  const results = cases.map((item) => ({
    ...item,
    passed: normalize(item.output) === normalize(item.expected),
  }));
  const passed = results.filter((item) => item.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

function printReport(report: EvalReport): void {
  for (const item of report.results) {
    console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}`);

    if (!item.passed) {
      console.log(
        `  expected=${JSON.stringify(item.expected)} actual=${JSON.stringify(item.output)}`,
      );
    }
  }

  console.log(`\n${report.passed}/${report.total} passed`);
}

try {
  const { positionals, values } = parseArgs({
    options: { report: { type: "string" } },
    allowPositionals: true,
  });
  const casesPath = positionals[0];

  if (casesPath === undefined || positionals.length !== 1) {
    throw new Error(
      "expected one case file path. Usage: npm run eval -- <cases.json> [--report <report.json>]",
    );
  }

  if (values.report !== undefined && resolve(values.report) === resolve(casesPath)) {
    throw new Error("report path must be different from the case file path");
  }

  const cases = await loadCases(casesPath);
  const report = evaluate(cases);
  printReport(report);

  if (values.report !== undefined) {
    try {
      await writeFile(values.report, JSON.stringify(report, null, 2) + "\n", "utf8");
    } catch (error) {
      throw new Error(
        `could not write report: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    console.log(`Report saved to ${values.report}`);
  }

  process.exitCode = report.failed === 0 ? 0 : 1;
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}
