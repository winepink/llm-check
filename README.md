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

## Exit codes

- `0`: all valid evaluations passed
- `1`: the case file was valid, but at least one evaluation failed
- `2`: the input file was missing, malformed, or had the wrong structure

Examples:

    npm run eval -- eval-cases.json
    npm run eval -- missing.json
