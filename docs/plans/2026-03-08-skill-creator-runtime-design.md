# Skill Creator Runtime Design

## Goal

Expose the installed `skill-creator` toolkit as a real Telegram bot capability with four modes:
- create
- eval
- improve
- benchmark

## Constraints

- `eval`, `improve`, and `benchmark` depend on the local `claude` CLI and authenticated session.
- The Telegram bot must therefore validate runtime prerequisites before attempting those modes.
- The workflow must be step-by-step because Telegram is conversational and stateful.

## Approach

Add a per-user `skill-creator` job system:

1. `/skill-creator` starts an interactive session.
2. The bot asks the mode.
3. Each mode collects only the fields it needs.
4. A runtime service writes or reads skill files, calls the installed `skill-creator` scripts, and returns results back to Telegram.

## Mode Details

### Create

- Collect: name, description, trigger situations, output format, whether to create evals
- Generate:
  - `SKILL.md`
  - `evals/evals.json` when requested
- Validate with `quick_validate.py`
- Return created skill path and summary

### Eval

- Collect: skill name/path and eval prompts
- If the skill already has `evals/evals.json`, use it
- Else generate a simple eval set file
- Run `run_eval.py`
- Return pass/fail summary

### Improve

- Collect: skill name/path and eval prompts if needed
- Run `run_loop.py` with bounded defaults
- Return best description and location of results

### Benchmark

- Collect: skill name/path and runs count
- Reuse eval set
- Run `run_eval.py` with multiple runs
- Return aggregate trigger metrics

## Persistence

- Keep per-user in-memory interactive state for current creation/eval job
- Save generated skills under a bot-owned directory configurable by env

## Safety

- Only allow the whitelisted Telegram user to run these workflows
- Validate skill names to kebab-case
- Never overwrite an existing generated skill without explicit confirmation

