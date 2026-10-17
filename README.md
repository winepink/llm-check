# llm-check

**A repeatable check for saved LLM classification outputs.**

Turn expected and actual labels into readable pass/fail results and an optional JSON report. Check output regressions without calling a model or paying for another inference run.

Built with **TypeScript and Node.js**. Comparison trims surrounding whitespace and lowercases both labels before exact matching.

## Quick start

Requires **Node.js 22+** and npm.

```bash
git clone https://github.com/winepink/llm-check.git
cd llm-check
npm ci
npm run check
npm run eval -- eval-cases.json
```

The sample intentionally includes an incorrect classification:

```text
PASS positive sentiment
PASS negative sentiment
FAIL neutral sentiment
  expected="neutral" actual="positive"

2/3 passed
```

Exit code **1 is expected** for this sample: evaluation found a mismatch.

## Define cases

Supply a nonempty JSON array with string fields `name`, `output`, and `expected`:

```json
[
  { "name": "positive sentiment", "output": " Positive\n", "expected": "positive" },
  { "name": "billing ticket", "output": "billing", "expected": "billing" }
]
```

```bash
npm run eval -- your-cases.json
```

`" Positive\n"` matches `"positive"`. Internal whitespace, punctuation, and wording still matter. This is a label checker, not semantic grading.

## Save a report

```bash
npm run eval -- eval-cases.json --report results.json
```

```json
{
  "total": 3,
  "passed": 2,
  "failed": 1,
  "results": [
    { "name": "positive sentiment", "output": "positive", "expected": "positive", "passed": true },
    { "name": "negative sentiment", "output": "negative\n", "expected": "negative", "passed": true },
    { "name": "neutral sentiment", "output": "positive", "expected": "neutral", "passed": false }
  ]
}
```

Reports retain original strings and are written even when cases fail. Paths are relative to the current directory; the parent must already exist. Existing reports are overwritten, and the report path must differ from the case file. The default `results.json` is ignored by Git.

## Exit codes

| Code | Meaning | Example |
| --- | --- | --- |
| `0` | Every case passed | All labels match |
| `1` | Evaluation mismatch | Actual label differs |
| `2` | Input, usage, or runner error | Missing file, malformed JSON, invalid fields, report write failure |

A shell script or CI job can distinguish mismatches from a broken invocation. No CI integration is bundled yet.

## Current scope

**Included:** input validation, normalized exact matching, per-case console results, JSON reports, and process exit codes.

**Not implemented yet:** model API calls, prompt execution, semantic similarity, LLM-as-judge scoring, latency/cost tracking, or a dashboard. Supply saved outputs yourself; no API key is required.

## Development

```bash
npm run check                         # Type-check without emitting files
npm test                              # Run CLI integration tests
npm run eval -- eval-cases.json       # Intentional mismatch: exit 1
npm run eval -- missing.json          # Input error: exit 2
```

The tests run the CLI against temporary files and check normalization,
saved reports, evaluation failures, invalid input, and report-write errors.
They remove their temporary files after each test. `npm test` exits with
code 0 when the assertions pass, including assertions about expected CLI failures.

```text
src/eval.ts        CLI, validation, evaluation, reporting
tests/cli.test.ts  CLI integration tests
eval-cases.json    Three classification examples
package.json       Scripts and pinned development dependencies
tsconfig.json      TypeScript configuration
```
