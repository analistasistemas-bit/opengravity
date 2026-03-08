# Skill Creator Runtime Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Telegram-native `/skill-creator` workflow that can create, evaluate, improve, and benchmark skills using the installed `skill-creator` toolkit.

**Architecture:** Introduce a per-user job state machine plus a `SkillCreatorService` wrapper around the local `skill-creator` scripts. `create` writes skill files directly; `eval`, `improve`, and `benchmark` invoke the installed Python scripts with validated runtime prerequisites.

**Tech Stack:** TypeScript, Grammy, child_process, local Python scripts from `~/.codex/skills/skill-creator`

---

### Task 1: Add job state and parser tests

**Files:**
- Create: `tests/skill-creator-session.test.ts`
- Create: `tests/skill-creator-service.test.ts`

**Step 1: Write the failing test**

Add tests for:
- starting a skill-creator session
- progressing through create prompts
- parsing modes
- validating kebab-case skill names

**Step 2: Run test to verify it fails**

Run:
```bash
node --import tsx --test tests/skill-creator-session.test.ts tests/skill-creator-service.test.ts
```

Expected: FAIL with missing modules.

**Step 3: Write minimal implementation**

Create session state and helper functions.

**Step 4: Run test to verify it passes**

Run the same test command.

**Step 5: Commit**

```bash
git add tests/skill-creator-session.test.ts tests/skill-creator-service.test.ts src/agent/skill_creator_session.ts src/agent/skill_creator_service.ts
git commit -m "feat(bot): add skill creator session and service"
```

### Task 2: Implement create mode

**Files:**
- Modify: `src/agent/skill_creator_service.ts`
- Modify: `src/index.ts`

**Step 1: Write the failing test**

Test generating `SKILL.md` and optional `evals/evals.json`.

**Step 2: Run test to verify it fails**

Run targeted tests.

**Step 3: Write minimal implementation**

Generate skill folder in bot-owned directory and validate with `quick_validate.py`.

**Step 4: Run test to verify it passes**

Run targeted tests.

**Step 5: Commit**

```bash
git add src/agent/skill_creator_service.ts src/index.ts tests/skill-creator-service.test.ts
git commit -m "feat(bot): implement skill creator create mode"
```

### Task 3: Implement eval/improve/benchmark wrappers

**Files:**
- Modify: `src/agent/skill_creator_service.ts`
- Modify: `src/index.ts`

**Step 1: Write the failing test**

Test command construction and prerequisite validation for:
- `run_eval.py`
- `run_loop.py`
- benchmark execution

**Step 2: Run test to verify it fails**

Run targeted tests.

**Step 3: Write minimal implementation**

Wrap the local Python scripts with proper `PYTHONPATH`, result paths, and bounded defaults.

**Step 4: Run test to verify it passes**

Run targeted tests.

**Step 5: Commit**

```bash
git add src/agent/skill_creator_service.ts src/index.ts tests/skill-creator-service.test.ts
git commit -m "feat(bot): implement skill creator eval improve benchmark modes"
```

### Task 4: Full verification

**Files:**
- Verify: `tests/*.ts`

**Step 1: Run targeted tests**

Run:
```bash
node --import tsx --test tests/agent-message-building.test.ts tests/google-workspace.test.ts tests/agent-tool-result.test.ts tests/tts-service.test.ts tests/index-queue.test.ts tests/skill-registry.test.ts tests/document-service.test.ts tests/capability-catalog.test.ts tests/pending-document-jobs.test.ts tests/document-action-parsing.test.ts tests/skill-creator-session.test.ts tests/skill-creator-service.test.ts
```

**Step 2: Run build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add .
git commit -m "feat(bot): add telegram skill creator workflows"
```
