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

test("covers the complete eight-skill matrix", () => {
  assert.deepEqual(Object.keys(baseSkills), [
    "Code Reading",
    "Code Modification",
    "Debug",
    "System Design",
    "Acceptance Testing",
    "Business Analysis",
    "AI Orchestration",
    "Delivery",
  ]);
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
