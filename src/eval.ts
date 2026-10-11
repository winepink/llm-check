import { readFile } from "node:fs/promises";

type EvalCase = {
  name: string;
  output: string;
  expected: string;
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

function runEvaluations(cases: EvalCase[]): boolean {
  let passed = 0;

  for (const item of cases) {
    const matches = normalize(item.output) === normalize(item.expected);
    if (matches) passed += 1;

    console.log(`${matches ? "PASS" : "FAIL"} ${item.name}`);

    if (!matches) {
      console.log(
        `  expected=${JSON.stringify(item.expected)} actual=${JSON.stringify(item.output)}`,
      );
    }
  }

  console.log(`\n${passed}/${cases.length} passed`);
  return passed === cases.length;
}

const casesPath = process.argv[2];

if (casesPath === undefined) {
  console.error("Input error: missing case file path");
  console.error("Usage: npm run eval -- <cases.json>");
  process.exitCode = 2;
} else {
  try {
    const cases = await loadCases(casesPath);
    process.exitCode = runEvaluations(cases) ? 0 : 1;
  } catch (error) {
    console.error(
      `Input error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 2;
  }
}
