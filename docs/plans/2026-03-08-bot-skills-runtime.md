# Bot Skills Runtime Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn installed local skills into real Telegram bot capabilities with consultive guidance and executable document workflows.

**Architecture:** Add a skill catalog plus per-user document workflow state. Route Telegram document uploads into a runtime action prompt, execute extraction/summarization for supported file types, and continue using local skill guidance inside the agent for consultive mode.

**Tech Stack:** TypeScript, Grammy, Groq, Firebase memory, local file extraction libraries

---

### Task 1: Add runtime document dependencies

**Files:**
- Modify: `package.json`

**Step 1: Write the failing test**

Create tests that import the planned document service module and fail because the module does not exist.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/document-service.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Install and wire dependencies for PDF, DOCX, XLSX, and PPTX extraction.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/document-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json package-lock.json tests/document-service.test.ts src/agent/document_service.ts
git commit -m "feat(bot): add document extraction service"
```

### Task 2: Add skill catalog and action selection

**Files:**
- Create: `src/agent/capability_catalog.ts`
- Test: `tests/capability-catalog.test.ts`

**Step 1: Write the failing test**

Test file extension to action suggestions for `pdf`, `docx`, `xlsx`, `pptx`.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/capability-catalog.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Return a deterministic set of suggested actions and labels for each supported file type.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/capability-catalog.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/agent/capability-catalog.ts tests/capability-catalog.test.ts
git commit -m "feat(bot): map file types to bot capabilities"
```

### Task 3: Add per-user pending document workflow

**Files:**
- Create: `src/lib/pending_document_jobs.ts`
- Test: `tests/pending-document-jobs.test.ts`

**Step 1: Write the failing test**

Test storing and resolving a pending document job per user.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/pending-document-jobs.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Add an in-memory per-user pending job store.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/pending-document-jobs.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/pending_document_jobs.ts tests/pending-document-jobs.test.ts
git commit -m "feat(bot): add pending document workflow state"
```

### Task 4: Integrate Telegram document uploads

**Files:**
- Modify: `src/index.ts`
- Modify: `src/agent/agent.ts`
- Test: `tests/document-action-parsing.test.ts`

**Step 1: Write the failing test**

Test action parsing from replies like `resuma`, `extraia texto`, `listar abas`, `listar slides`.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/document-action-parsing.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Handle `message:document`, download the file, save pending job, ask follow-up options, and execute actions when the user replies.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/document-action-parsing.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/index.ts src/agent/agent.ts tests/document-action-parsing.test.ts
git commit -m "feat(bot): support interactive document actions"
```

### Task 5: Full verification

**Files:**
- Verify: `tests/*.ts`

**Step 1: Run targeted tests**

Run:
```bash
node --import tsx --test tests/agent-message-building.test.ts tests/google-workspace.test.ts tests/agent-tool-result.test.ts tests/tts-service.test.ts tests/index-queue.test.ts tests/skill-registry.test.ts tests/document-service.test.ts tests/capability-catalog.test.ts tests/pending-document-jobs.test.ts tests/document-action-parsing.test.ts
```

Expected: all passing

**Step 2: Run build**

Run: `npm run build`
Expected: success

**Step 3: Commit**

```bash
git add .
git commit -m "feat(bot): add skill-backed document workflows"
```
