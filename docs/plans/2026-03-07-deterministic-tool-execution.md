# Deterministic Tool Execution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fragile native Groq tool-calling with a deterministic LLM intent planner plus backend tool executor so Gmail, Calendar, Drive, and related commands work reliably.

**Architecture:** The agent will make a first Groq call that returns a JSON intent object instead of native `tool_calls`. The backend will validate and execute the requested tool locally, then make a second Groq call to turn the tool result into a natural-language answer. The Telegram entrypoint will serialize requests per user to avoid cross-talk between overlapping messages.

**Tech Stack:** TypeScript, Groq Chat Completions, Grammy, Firebase Admin, `gog` CLI, Node test runner

---

### Task 1: Planner Contract

**Files:**
- Modify: `src/agent/agent.ts`
- Test: `tests/agent-message-building.test.ts`

**Step 1: Write the failing test**
- Add tests for parsing a JSON planner payload and for rejecting malformed non-JSON content.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/agent-message-building.test.ts`
Expected: FAIL because planner helpers do not exist yet.

**Step 3: Write minimal implementation**
- Add planner prompt and helper(s) to parse/validate the planner JSON contract.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/agent-message-building.test.ts`
Expected: PASS

### Task 2: Deterministic Tool Executor

**Files:**
- Modify: `src/agent/agent.ts`
- Modify: `src/tools/google_workspace.ts`
- Test: `tests/agent-message-building.test.ts`
- Test: `tests/google-workspace.test.ts`

**Step 1: Write the failing test**
- Add tests for planner argument normalization and for executing supported intents without native `tool_calls`.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/agent-message-building.test.ts tests/google-workspace.test.ts`
Expected: FAIL because execution helpers are missing.

**Step 3: Write minimal implementation**
- Map planner intents to backend handlers.
- Normalize arguments (`limit`, Gmail query cleanup, date defaults).
- Remove dependence on Groq `tools` from the agent execution path.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/agent-message-building.test.ts tests/google-workspace.test.ts`
Expected: PASS

### Task 3: Per-User Serialization

**Files:**
- Modify: `src/index.ts`
- Test: `tests/index-queue.test.ts`

**Step 1: Write the failing test**
- Add a test that proves two overlapping requests from the same user run sequentially.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/index-queue.test.ts`
Expected: FAIL because the queue helper does not exist.

**Step 3: Write minimal implementation**
- Add a per-user promise chain in the Telegram entrypoint so only one message per user is processed at a time.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/index-queue.test.ts`
Expected: PASS

### Task 4: Final Verification and Delivery

**Files:**
- Modify: `src/agent/agent.ts`
- Modify: `src/index.ts`
- Modify: `src/tools/google_workspace.ts`
- Test: `tests/agent-message-building.test.ts`
- Test: `tests/google-workspace.test.ts`
- Test: `tests/index-queue.test.ts`

**Step 1: Run focused tests**

Run: `node --import tsx --test tests/agent-message-building.test.ts tests/google-workspace.test.ts tests/index-queue.test.ts tests/agent-tool-result.test.ts tests/tts-service.test.ts`
Expected: PASS

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/agent/agent.ts src/index.ts src/tools/google_workspace.ts tests/agent-message-building.test.ts tests/google-workspace.test.ts tests/index-queue.test.ts docs/plans/2026-03-07-deterministic-tool-execution.md
git commit -m "refactor(agent): switch to deterministic tool execution"
git push origin main
```
