import assert from "node:assert/strict";
import test from "node:test";
import { baseSkills, taskChecks, tasks } from "../app/data.ts";

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
