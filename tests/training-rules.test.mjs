import assert from "node:assert/strict";
import test from "node:test";
import { baseSkills, selectDailyTasks, taskChecks, tasks } from "../app/data.ts";

function evaluate(task, workspace) {
  const normalized = workspace.toLocaleLowerCase().replace(/\s+/g, "");
  return (taskChecks[task.id] ?? []).map((check) =>
    check.groups.every((group) =>
      group.some((token) =>
        normalized.includes(token.toLocaleLowerCase().replace(/\s+/g, "")),
      ),
    ),
  );
}

test("covers the complete world-model and AI-control engineering matrix", () => {
  assert.deepEqual(Object.keys(baseSkills), [
    "System Modeling",
    "Planning",
    "Hypothesis",
    "Falsification",
    "Tool Selection",
    "Observation",
    "State Update",
    "AI Judgment",
    "AI Orchestration",
    "Specification",
    "Architecture Reasoning",
    "Verification",
    "Scope Control",
    "Cognitive Load Management",
    "Review Capacity",
    "Context Management",
    "AI Output Control",
    "Change Impact Analysis",
    "Diff Review",
    "Architecture Guardrails",
    "AI Pacing",
    "Engineering Ownership",
    "Requirement Convergence",
    "Business Understanding",
    "Requirement Completeness",
    "Solution Convergence",
    "Technical Tradeoff",
    "Implementation Planning",
    "Acceptance Design",
    "Evidence Quality",
  ]);
  assert.equal(Object.keys(baseSkills).length, 30);
});

test("every mission has four executable acceptance checks", () => {
  for (const task of tasks) {
    assert.equal(task.criteria.length, 4, task.id);
    assert.equal(taskChecks[task.id]?.length, 4, task.id);
  }
});

test("every reference solution passes its real acceptance checks", () => {
  for (const task of tasks) {
    assert.deepEqual(evaluate(task, task.solution), [true, true, true, true], task.id);
  }
});

test("unmodified workspaces cannot silently pass all checks", () => {
  for (const task of tasks) {
    assert.equal(evaluate(task, task.context).every(Boolean), false, task.id);
  }
});

test("continuous bank has enough templates and three limited hints", () => {
  assert.ok(tasks.length >= 20);
  for (const task of tasks) assert.equal(task.hints.length, 3, task.id);
});

test("daily rotation excludes recently completed variants", () => {
  const first = selectDailyTasks([], baseSkills, new Date("2026-08-14T00:00:00Z"), 3);
  assert.equal(new Set(first.map((task) => task.id)).size, 3);
  const recent = first.map((task) => task.variantId);
  const second = selectDailyTasks(recent, baseSkills, new Date("2026-08-15T00:00:00Z"), 3);
  assert.equal(second.some((task) => recent.includes(task.variantId)), false);
});

test("task bank exposes multi-file labs and L1-L5 difficulty", () => {
  for (const task of tasks) {
    assert.ok(task.files.length >= 2, task.id);
    assert.ok(task.difficultyLevel >= 1 && task.difficultyLevel <= 5, task.id);
  }
});

test("every task can train AI review, specification and ownership", () => {
  for (const task of tasks) {
    assert.equal(typeof task.aiSubmission?.confidence, "number", task.id);
    assert.ok(task.guardrails.length >= 4, task.id);
    assert.equal(task.specificationDimensions.length, 11, task.id);
    assert.equal(task.completionClaims.length, 12, task.id);
  }
  assert.ok(tasks.some((task) => task.type === "AI CODE REVIEW"));
  assert.ok(tasks.some((task) => task.type === "SPECIFICATION LAB"));
  assert.ok(tasks.some((task) => task.type === "COMPLETION VERIFICATION"));
});

test("advanced bank covers ambiguous, false-alarm, multi-root and cross-module scenarios", () => {
  const scenarioClasses = new Set(tasks.map((task) => task.scenarioClass));
  for (const kind of ["ambiguous", "false-alarm", "multiple-root-causes", "cross-module-debugging", "wrong-ai-advice", "no-bug"]) {
    assert.ok(scenarioClasses.has(kind), kind);
  }
  for (const task of tasks) {
    assert.ok(task.faultInjection?.length > 8, task.id);
    assert.ok(task.expectedObservation?.length > 8, task.id);
    assert.ok(task.tools?.includes("runtime"), task.id);
  }
});

test("every task enforces a bounded, reviewable AI change", () => {
  for (const task of tasks) {
    assert.ok(task.changeBudget.maxFiles >= 1, task.id);
    assert.ok(task.changeBudget.maxLines >= 40, task.id);
    assert.equal(task.aiSuggestions.length, 3, task.id);
    assert.ok(task.aiSubmission.filesChanged >= 1, task.id);
    assert.equal(typeof task.aiSubmission.linesAdded, "number", task.id);
  }
});

test("bank covers all cognitive-load and scope-control challenges", () => {
  const types = new Set(tasks.map((task) => task.type));
  for (const type of ["OVERSIZED AI DIFF","SCOPE CREEP CHALLENGE","ARCHITECTURE DRIFT CHALLENGE","UNNECESSARY REFACTOR","DEPENDENCY EXPLOSION","MIGRATION RISK CHALLENGE","AI OVERGENERATION","CONTEXT DRIFT","HIDDEN CHANGE","REVIEW OVERLOAD"]) {
    assert.ok(types.has(type), type);
  }
  assert.ok(tasks.length >= 40);
});

test("bank covers the complete four-layer funnel challenge set", () => {
  const types = new Set(tasks.map((task) => task.type));
  for (const type of ["AMBIGUOUS REQUIREMENT","CONFLICTING REQUIREMENT","WRONG SOLUTION","OVERENGINEERED SOLUTION","UNDERENGINEERED SOLUTION","MISSING ACCEPTANCE CRITERIA","FAKE AI COMPLETION","WRONG BUSINESS OUTCOME","NO BUG SCENARIO","WRONG REQUIREMENT","FDE CUSTOMER SIMULATION","AI ENGINEER FUNNEL"]) {
    assert.ok(types.has(type), type);
  }
  assert.ok(tasks.length >= 52);
  assert.equal(tasks.length * 5, 260);
});
