import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyzeRequirement, baseSkills, getTaskProfile, isMeaningfulRequirementValue, requirementSteps, selectDailyTasks, starterLayers, taskChecks, tasks } from "../app/data.ts";
import { saveDraft, loadDraft, hasDraft, clearDraft, getDraftSavedAt } from "../app/training-draft.ts";

// localStorage polyfill for Node.js test runner
if(typeof globalThis.localStorage==="undefined"){
  let store={};
  globalThis.localStorage={getItem(key){return store[key]??null},setItem(key,value){store[key]=String(value)},removeItem(key){delete store[key]},clear(){store={}},get length(){return Object.keys(store).length},key(index){return Object.keys(store)[index]??null}};
}

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
    "Requirement Clarification",
    "Requirement Testability",
    "Requirement Prioritization",
    "Constraint Reasoning",
    "Conflict Resolution",
    "Assumption Management",
    "Evidence Definition",
    "Solution Convergence",
    "Technical Tradeoff",
    "Implementation Planning",
    "Acceptance Design",
    "Evidence Quality",
  ]);
  assert.equal(Object.keys(baseSkills).length, 37);
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

test("requirement funnel has ten unique, stable steps", () => {
  assert.equal(requirementSteps.length, 10);
  assert.equal(new Set(requirementSteps.map((step) => step.id)).size, 10);
  assert.deepEqual(requirementSteps.map((step) => step.label), ["Who","Why","What","Input / Output","Constraint","Success Metric","Failure Condition","Evidence","Known / Unknown","Assumptions / Conflicts"]);
});

test("empty and placeholder answers never increase requirement completeness", () => {
  for (const value of ["", "   ", "请输入", "待补充", "暂无", "TODO", "N/A", "placeholder"]) {
    assert.equal(isMeaningfulRequirementValue(value), false, value);
  }
  assert.equal(analyzeRequirement({ user: "请输入", what: "待补充" }).completeness, 0);
  assert.equal(isMeaningfulRequirementValue("客户运营经理负责验收"), true);
});

test("requirement scores and blocker counts stay in valid ranges", () => {
  const complete = {
    user:"客户运营经理负责验收并承担上线结果", why:"当前人工复核每天浪费两小时且容易漏单", what:"把待复核订单转成可追踪的已确认状态", input:"订单编号、当前状态和操作者权限", output:"已确认状态、审计记录和明确响应", constraints:"不新增依赖，不改变数据库，单次只修改三个文件", priorities:"Must 保证权限与幂等，Should 保持响应速度", successMetric:"以当前 8% 漏单率为基线，7 天内降至 1% 以下", failureCondition:"出现越权确认或重复写入即判定失败", signals:"接口响应、审计日志和刷新后的订单状态", sources:"客服工单、生产日志与业务负责人访谈记录", knownFacts:"生产日志确认重复请求会到达同一接口", unknowns:"仍需确认历史客户端是否自动重试", assumptions:"假设订单编号全局唯一，需用数据库记录验证", conflicts:"已检查性能与审计要求，安全优先于响应速度",
  };
  for (const result of [analyzeRequirement({}), analyzeRequirement(complete)]) {
    assert.ok(result.quality >= 0 && result.quality <= 100);
    assert.ok(result.completeness >= 0 && result.completeness <= 100);
    assert.ok(Number.isInteger(result.blocking.length) && result.blocking.length >= 0);
  }
  assert.equal(analyzeRequirement(complete).blocking.length, 0);
});

test("vague term in 'what' field is reported on 'what', not 'successMetric'", () => {
  const result = analyzeRequirement({ what: "让搜索更智能" });
  const vagueIssues = result.issues.filter(i => i.kind === "ambiguous");
  assert.ok(vagueIssues.length > 0, "should detect vague term");
  const whatIssue = vagueIssues.find(i => i.field === "what");
  assert.ok(whatIssue, "should report on 'what' field");
  assert.ok(!vagueIssues.some(i => i.field === "successMetric"), "should not report on successMetric when vague term is in what");
});

test("vague term with measurable context is exempted", () => {
  const result = analyzeRequirement({
    what: "把'更智能'定义为 NDCG@10 从 0.42 提升到 0.50",
    successMetric: "NDCG@10 从 0.42 提升到 0.50, 2 周观察窗",
  });
  const vagueIssues = result.issues.filter(i => i.kind === "ambiguous");
  assert.equal(vagueIssues.length, 0, "should not block when vague term is contextualized with measurable content");
  const exempted = result.clarityDeductions.filter(d => d.deduction === 0);
  assert.ok(exempted.length > 0, "should have exempted deductions with deduction=0");
});

test("vague terms in multiple fields generate separate issues", () => {
  const result = analyzeRequirement({
    what: "让搜索更智能",
    successMetric: "搜索体验更好",
  });
  const vagueIssues = result.issues.filter(i => i.kind === "ambiguous");
  assert.ok(vagueIssues.length >= 2, "at least two vague-term issues");
  const fields = vagueIssues.map(i => i.field);
  assert.ok(fields.includes("what"), "should have issue on 'what'");
  assert.ok(fields.includes("successMetric"), "should have issue on 'successMetric'");
});

test("clarityDeductions are returned with correct structure", () => {
  const result = analyzeRequirement({ what: "让搜索更智能" });
  assert.ok(Array.isArray(result.clarityDeductions));
  assert.ok(result.clarityDeductions.length > 0);
  const d = result.clarityDeductions[0];
  assert.equal(typeof d.field, "string");
  assert.equal(typeof d.term, "string");
  assert.equal(typeof d.deduction, "number");
  assert.equal(typeof d.reason, "string");
  assert.ok(d.deduction >= 0);
});

test("production-critical requirement UI and idempotency guards are present", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/progress/route.ts", import.meta.url), "utf8");
  for (const selector of [".requirement-health", ".progressive-rail", ".current-blocker", ".quality-blockers"]) assert.ok(css.includes(selector), selector);
  assert.ok(page.includes("查看其余 {remainingIssues.length} 个问题"));
  assert.ok(page.includes("forge-requirement-draft-v1"));
  assert.ok(route.includes("_submissionId"));
  assert.ok(route.includes("duplicate:true"));
});

test("admin catalog requests cannot remain stuck indefinitely", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/tasks/route.ts", import.meta.url), "utf8");
  assert.ok(page.includes("controller.abort()"));
  assert.ok(page.includes("finally{setBusy(false)}"));
  assert.ok(route.includes("ADMIN_QUERY_TIMEOUT_MS"));
  assert.ok(route.includes('"cache-control":"private, no-store, max-age=0"'));
});

test("draft can be saved and loaded", () => {
  const task = tasks[0];
  const state = { phase: "model", observation: {}, systemModel: {}, diagnosis: {}, actionPlan: {}, evidence: {}, stateUpdate: {}, reflection: {}, reviewDecision: {}, specificationCoverage: [], releaseChecks: [], funnelHistory: [], workspace: {}, selectedFile: "test.ts", results: [], hints: 0, firstHintSeconds: 0, diagnosisLockedBeforeHint: true, startedAt: Date.now() };
  saveDraft(task, state);
  assert.ok(hasDraft(task));
  const loaded = loadDraft(task);
  assert.ok(loaded);
  assert.equal(loaded.state.phase, "model");
});

test("draft is cleared after completion", () => {
  const task = tasks[0];
  const state = { phase: "observe", observation: {}, systemModel: {}, diagnosis: {}, actionPlan: {}, evidence: {}, stateUpdate: {}, reflection: {}, reviewDecision: {}, specificationCoverage: [], releaseChecks: [], funnelHistory: [], workspace: {}, selectedFile: "test.ts", results: [], hints: 0, firstHintSeconds: 0, diagnosisLockedBeforeHint: true, startedAt: Date.now() };
  saveDraft(task, state);
  assert.ok(hasDraft(task));
  clearDraft(task);
  assert.equal(hasDraft(task), false);
  assert.equal(loadDraft(task), null);
});

test("draft savedAt returns a parseable timestamp", () => {
  const task = tasks[0];
  const state = { phase: "observe", observation: {}, systemModel: {}, diagnosis: {}, actionPlan: {}, evidence: {}, stateUpdate: {}, reflection: {}, reviewDecision: {}, specificationCoverage: [], releaseChecks: [], funnelHistory: [], workspace: {}, selectedFile: "test.ts", results: [], hints: 0, firstHintSeconds: 0, diagnosisLockedBeforeHint: true, startedAt: Date.now() };
  saveDraft(task, state);
  const savedAt = getDraftSavedAt(task);
  assert.ok(savedAt);
  const date = new Date(savedAt);
  assert.ok(!isNaN(date.getTime()));
  clearDraft(task);
});

// ── Dual-mode: starter / mastery ──

test("starterLayers has exactly 4 layers with 4+4+3+4 fields", () => {
  assert.equal(starterLayers.length, 4);
  assert.deepEqual(starterLayers.map(l => l.label), ["Define", "Design", "Build", "Prove"]);
  assert.deepEqual(starterLayers.map(l => l.fields.length), [4, 4, 3, 4]);
  // total fields = 15 (matches "约15个核心回答")
  const totalFields = starterLayers.reduce((sum, l) => sum + l.fields.length, 0);
  assert.equal(totalFields, 15);
});

test("starterLayers fields have valid source references", () => {
  const validSources = ["observation", "systemModel", "diagnosis", "actionPlan", "evidence", "reflection"];
  for (const layer of starterLayers) {
    for (const field of layer.fields) {
      assert.ok(validSources.includes(field.source), `${field.key} has invalid source: ${field.source}`);
      assert.ok(typeof field.key === "string" && field.key.length > 0);
      assert.ok(typeof field.label === "string" && field.label.length > 0);
      assert.ok(typeof field.placeholder === "string" && field.placeholder.length > 0);
    }
  }
});

test("getTaskProfile classifies all task types correctly", () => {
  // code-change
  for (const type of ["DEBUG", "CODE MODIFICATION", "CODE CHANGE", "AI ORCHESTRATION"]) {
    assert.equal(getTaskProfile({ type }), "code-change", type);
  }
  // code-understanding
  assert.equal(getTaskProfile({ type: "CODE READING" }), "code-understanding");
  // design-analysis
  for (const type of ["SYSTEM DESIGN", "BUSINESS ANALYSIS", "AMBIGUOUS REQUIREMENT", "CONFLICTING REQUIREMENT", "WRONG SOLUTION", "FDE CUSTOMER SIMULATION", "AI ENGINEER FUNNEL"]) {
    assert.equal(getTaskProfile({ type }), "design-analysis", type);
  }
  // review-verification
  for (const type of ["AI CODE REVIEW", "SPECIFICATION LAB", "COMPLETION VERIFICATION", "NO BUG SCENARIO", "OVERSIZED AI DIFF", "SCOPE CREEP CHALLENGE", "ARCHITECTURE DRIFT CHALLENGE", "UNNECESSARY REFACTOR", "DEPENDENCY EXPLOSION", "MIGRATION RISK CHALLENGE", "AI OVERGENERATION", "CONTEXT DRIFT", "HIDDEN CHANGE", "REVIEW OVERLOAD"]) {
    assert.equal(getTaskProfile({ type }), "review-verification", type);
  }
  // default
  assert.equal(getTaskProfile({ type: "UNKNOWN TYPE" }), "code-change");
});

test("getTaskProfile covers all real tasks", () => {
  const profiles = new Set(tasks.map(t => getTaskProfile(t)));
  assert.ok(profiles.has("code-change"));
  assert.ok(profiles.has("code-understanding"));
  assert.ok(profiles.has("design-analysis"));
  assert.ok(profiles.has("review-verification"));
});

test("draft without trainingMode defaults to mastery", () => {
  const task = tasks[0];
  const state = { phase: "observe", observation: {}, systemModel: {}, diagnosis: {}, actionPlan: {}, evidence: {}, stateUpdate: {}, reflection: {}, reviewDecision: {}, specificationCoverage: [], releaseChecks: [], funnelHistory: [], workspace: {}, selectedFile: "test.ts", results: [], hints: 0, firstHintSeconds: 0, diagnosisLockedBeforeHint: true, startedAt: Date.now() };
  // save as v1 (no trainingMode) by manipulating stored version
  saveDraft(task, { ...state, trainingMode: "starter" });
  // simulate v1 draft by setting version to 1
  const key = `forge-training-draft:v2:${task.variantId ?? task.id}`;
  const raw = localStorage.getItem(key);
  const parsed = JSON.parse(raw);
  parsed.version = 1;
  delete parsed.state.trainingMode;
  localStorage.setItem(key, JSON.stringify(parsed));
  const loaded = loadDraft(task);
  assert.ok(loaded);
  assert.equal(loaded.state.trainingMode, "mastery");
  clearDraft(task);
});

test("draft preserves trainingMode across save/load", () => {
  const task = tasks[0];
  const state = { phase: "observe", trainingMode: "starter", observation: {}, systemModel: {}, diagnosis: {}, actionPlan: {}, evidence: {}, stateUpdate: {}, reflection: {}, reviewDecision: {}, specificationCoverage: [], releaseChecks: [], funnelHistory: [], workspace: {}, selectedFile: "test.ts", results: [], hints: 0, firstHintSeconds: 0, diagnosisLockedBeforeHint: true, startedAt: Date.now() };
  saveDraft(task, state);
  const loaded = loadDraft(task);
  assert.ok(loaded);
  assert.equal(loaded.state.trainingMode, "starter");
  clearDraft(task);
});

test("completed draft (phase=result) is not restored", () => {
  const task = tasks[0];
  const state = { phase: "result", trainingMode: "starter", observation: {}, systemModel: {}, diagnosis: {}, actionPlan: {}, evidence: {}, stateUpdate: {}, reflection: {}, reviewDecision: {}, specificationCoverage: [], releaseChecks: [], funnelHistory: [], workspace: {}, selectedFile: "test.ts", results: [], hints: 0, firstHintSeconds: 0, diagnosisLockedBeforeHint: true, startedAt: Date.now() };
  saveDraft(task, state);
  assert.equal(loadDraft(task), null);
  clearDraft(task);
});

test("starter form validation rejects empty fields and requires 4 passing tests", () => {
  // Replicate validStarter logic inline
  const getValue = (source, key, body) => {
    const map = { observation: body.observation ?? {}, systemModel: body.systemModel ?? {}, diagnosis: body.diagnosis ?? {}, actionPlan: body.actionPlan ?? {}, evidence: body.evidence ?? {}, reflection: body.reflection ?? {} };
    return String((map[source] ?? {})[key] ?? "").trim();
  };
  const validStarter = (body) => {
    const tests = Array.isArray(body.testResults) ? body.testResults : [];
    const testsPassed = tests.length === 4 && tests.every(t => Boolean(t && typeof t === "object" && "passed" in t && t.passed === true));
    return starterLayers.every(layer =>
      layer.fields.every(f => getValue(f.source, f.key, body).length >= (f.minLength ?? 4))
    ) && Boolean(body.reviewDecision?.finalApproval) && testsPassed;
  };

  // Empty body should fail
  assert.equal(validStarter({}), false);

  const passedTests = [{label:"a",passed:true},{label:"b",passed:true},{label:"c",passed:true},{label:"d",passed:true}];

  // Complete starter body should pass
  const complete = {
    observation: { user: "客户运营经理", what: "把待复核订单转成已确认", successMetric: "漏单率从8%降至1%", sources: "生产日志+客服工单" },
    systemModel: { currentState: "当前人工复核每天两小时" },
    diagnosis: { hypothesis: "添加状态机+权限校验", firstCheckpoint: "查看POST接口校验逻辑", counterEvidence: "如果日志显示校验通过则不是权限问题" },
    actionPlan: { scopeGoal: "只修改confirm_order函数", selectedTool: "代码编辑器", expectedObservation: "重复确认返回409" },
    evidence: { actual: "运行测试后4项全部通过" },
    reflection: { keyEvidence: "测试输出显示状态机正确", largestRisk: "并发请求需确保事务隔离", nextFirstStep: "先看业务不变量再查权限" },
    reviewDecision: { finalApproval: true },
    testResults: passedTests,
  };
  assert.equal(validStarter(complete), true);

  // Missing finalApproval should fail
  assert.equal(validStarter({ ...complete, reviewDecision: { finalApproval: false } }), false);

  // Missing testResults should fail
  assert.equal(validStarter({ ...complete, testResults: [] }), false);

  // Less than 4 tests should fail
  assert.equal(validStarter({ ...complete, testResults: passedTests.slice(0, 3) }), false);

  // A failed test should fail
  const failedTests = [{label:"a",passed:true},{label:"b",passed:false},{label:"c",passed:true},{label:"d",passed:true}];
  assert.equal(validStarter({ ...complete, testResults: failedTests }), false);

  // Missing one field should fail
  const incomplete = { ...complete, observation: { ...complete.observation, user: "" } };
  assert.equal(validStarter(incomplete), false);
});

test("page.tsx dual-mode code is present", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/progress/route.ts", import.meta.url), "utf8");
  // Page has mode-related code
  assert.ok(page.includes("trainingMode"), "page.tsx should contain trainingMode");
  assert.ok(page.includes("advanceStarterDefine"), "page.tsx should contain advanceStarterDefine");
  assert.ok(page.includes("StarterForm"), "page.tsx should contain StarterForm");
  assert.ok(page.includes("starterLayers"), "page.tsx should reference starterLayers");
  // CSS has mode styles
  assert.ok(css.includes(".mode-switch"), "globals.css should contain .mode-switch");
  assert.ok(css.includes(".stagebar-four"), "globals.css should contain .stagebar-four");
  assert.ok(css.includes(".starter-form"), "globals.css should contain .starter-form");
  assert.ok(css.includes(".mode-badge"), "globals.css should contain .mode-badge");
  assert.ok(css.includes(".upgrade-prompt"), "globals.css should contain .upgrade-prompt");
  // Route has mode validation
  assert.ok(route.includes("validStarter"), "route.ts should contain validStarter");
  assert.ok(route.includes("trainingMode"), "route.ts should contain trainingMode");
  assert.ok(route.includes("modeWeight"), "route.ts should contain modeWeight");
});
