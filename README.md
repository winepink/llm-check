# llm-check

A small CLI for checking LLM outputs against repeatable examples.

Currently evaluates saved classification outputs from a JSON file using
normalized exact matching. It does not call a model yet.

## Run

Requires Node.js 22 or newer.

    npm ci
    npm run check
    npm run eval -- eval-cases.json

The sample includes one incorrect output. Expect two passes, one failure,
and exit code 1.

## Case file format

The evaluator expects a nonempty JSON array. Each case must have string
fields named `name`, `output`, and `expected`.

    [
      { "name": "positive sentiment", "output": "positive", "expected": "positive" }
    ]

Comparison trims leading and trailing whitespace and lowercases both
`output` and `expected`.

## Save results

    npm run eval -- eval-cases.json --report results.json

The sample still prints two passes and one failure and exits with code 1.
It also writes `results.json`, including results for the failed case:

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

The report keeps the original strings; normalization only affects comparison.
Paths are relative to the current directory. The report's parent directory
must already exist. An existing report is overwritten, so use a new filename
to keep an earlier run. The report path must differ from the case file path.
The default example filename `results.json` is ignored by Git.

## Exit codes

- `0`: all valid evaluations passed
- `1`: the case file was valid, but at least one evaluation failed
- `2`: invalid arguments, missing or invalid input, or a runner error such as
  being unable to write the report

Examples:

    npm run eval -- eval-cases.json
    npm run eval -- missing.json
