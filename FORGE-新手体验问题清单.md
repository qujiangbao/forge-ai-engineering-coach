# FORGE 新手体验 — 完整问题清单

> 实验日期: 2026-08-15 ~ 2026-08-16
> 实验任务: L2「客户只说把搜索做得更智能」(ambiguous-requirement-funnel)
> 实验方式: 以新手身份从 observe 走到 learn, 逐阶段填写并记录卡点
> 数据来源: 浏览器实操验证 + 源码静态分析 (app/page.tsx, app/data.ts)

---

## 实验背景

### 已实现的新手引导
- WorkedExample 推理示范面板 (八阶段思考顺序, 默认折叠)
- NewbieBar 新手引导条 (sessions 为空时显示, 一键进入 L2 任务)
- 仅改 2 文件 (app/page.tsx + app/globals.css), 未动 DB/API/推荐逻辑
- 质量门全过: lint ✓ / typecheck ✓ / test 17/17 ✓ / build ✓

### 八阶段漏斗全貌 (代码核实)

| 阶段 | 组件 | 字段数 | Gate |
|---|---|---|---|
| 01 Observe | ObservationForm | 14 框 (10 步 progressive-rail) | 批准并锁定 v 1 → 通过需求门 |
| 02 Model | SystemModel | 12 框 | 通过方案门, 验证实现假设 → |
| 03 Hypothesis | DiagnosisForm | 7 框 | 锁定判断, 进入工具 → |
| 04 Plan | ActionPlanForm | 13 框 + 审批门 | 通过审批门, 开始小步实现 → |
| 05 Act | Lab | 代码编辑器 + 工具面板 | 运行自动验收 → 进入证据验证 → |
| 06 Verify | EvidenceForm | 4 框 | 提交证据, 进入复盘 → |
| 07 Update | StateUpdateForm | 5 框 | 更新认知, 进入复盘 → |
| 08 Learn | ReflectionForm | 10 框 + checklist + 审批 | 批准验收并完成漏斗 → |
| 09 Result | Result | 评分展示 | — |

**总计: 65+ 输入框, 8 道 approval gate**

---

## 🔴 P0 — 阻塞级 (新手会被卡住, 无法推进)

### 问题 1: vagueTerms 字面匹配误伤 + 错误提示指向错误字段

**严重程度**: 阻塞 — 新手反复修改错误字段, blocker 不消, 无法过 approval gate

**代码位置**:
- [data.ts:42](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/data.ts#L42) — vagueTerms 定义
- [data.ts:48-49](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/data.ts#L48-L49) — 检测逻辑与错误提示

**当前代码**:
```typescript
const vagueTerms = ["更快","更智能","更稳定","体验更好","尽可能","高效","最好","优化一下"]

// 检测范围: what + successMetric + constraints 三个字段
const vague = vagueTerms.filter(word =>
  `${read("what")} ${read("successMetric")} ${read("constraints")}`.includes(word))

// 但错误提示永远指向 successMetric 字段!
if (vague.length) issues.push({
  kind: "ambiguous",
  field: "successMetric",  // ← 永远指向 successMetric
  label: "Ambiguous Language",
  message: `"${vague.join("、")}"无法直接验收。`,
  action: "把模糊形容词改成基线、目标值和观察时间窗。"
})
```

**问题描述**:
1. **误伤**: 题目 context 本身是客户说"make search smarter", 新手在 What 步讨论客户需求时几乎必然引用"更智能"这个词 → 被字面匹配误伤
2. **误导**: blocker 提示永远指向 `successMetric` 字段, 但真凶可能在 `what` 或 `constraints` 字段。新手反复修改 Success Metric 而 blocker 始终不消

**实验验证**:
| 轮次 | 修改内容 | Clarity | blocker 状态 |
|---|---|---|---|
| 第一版 | 十步全填 (Completeness 100%) | 50/100 | Ambiguous Language: "更智能" |
| 第二版 | 把 Success Metric 改成具体基线+目标值+时间窗 | 75/100 | **blocker 仍在** — What 步的"更智能"没改 |
| 第三版 | 把 What 步的"更智能"改成可度量维度 | 100/100 | blocker 归零 |

**修复建议**:
1. 改成语义检测: 判断答案是否把模糊词具体化了 (如"更智能 → 相关性 NDCG@10"), 而非字面匹配
2. 错误提示指向真正含模糊词的字段: 当前 `field: "successMetric"` 应改为 `field: vagueFields[0]` (指向实际检测到模糊词的字段)
3. WorkedExample observe 步加避坑提示: "勿引用客户原话里的模糊词, 改用可度量维度描述"

---

### 问题 2: model 阶段 12 个字段, WorkedExample 引导只有一句话

**严重程度**: 阻塞 — 新手面对 12 个 blank textarea 不知道每个字段应该写什么

**代码位置**:
- [page.tsx](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/page.tsx) — WorkedExample 八阶段引导
- [page.tsx](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/page.tsx) — SystemModel 表单

**当前引导 vs 实际字段**:
```
WorkedExample model 阶段引导: "画调用链与数据流, 标系统边界" (一句话)

实际字段:
  1. 系统边界
  2. 运行时状态
  3. 当前系统
  4. 目标架构
  5. 候选方案
  6. 权衡矩阵
  7. 风险矩阵
  8. ADR / 决策记录
  9. 状态转换
 10. 调用链
 11. 数据流
 12. 依赖图
```

**问题描述**:
- 12 个 blank textarea, 无 placeholder, 无示例, 无字段间关系说明
- 新手填完一个字段后完全不知道下一个字段应该写什么、什么算合格
- 更严重的是 hypothesis (7 字段)、plan (13 字段) 同样只有一句话引导

**修复建议**:
WorkedExample 每阶段展开为子清单, 对应每个字段给一句引导。例如 model 阶段:
```
系统边界 → "画一个圈: 圈内是你要改的系统, 圈外是依赖方"
运行时状态 → "当前系统在跑什么? 有什么已知症状?"
候选方案 → "列出至少 2 个可选方案, 说明差异"
权衡矩阵 → "从工期/收益/复杂度/可逆性四个维度对比方案"
```

---

### 问题 3: 八阶段 65+ 输入框, 无断点续传, 不可跨 session 继续

**严重程度**: 阻塞 — 关闭标签页即丢失全部进度, 新手无法分次完成

**代码位置**:
- [page.tsx](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/page.tsx) — `openTask()` 函数
- localStorage key: `forge-requirement-draft-v1`

**问题描述**:
- observe 14 框 + model 12 + hypothesis 7 + plan 13 + verify 4 + update 5 + learn 10 = **65+ 输入框**
- 8 道 approval gate, 每道 gate 有字符数下限 (6-8 字符)
- 无"保存草稿"按钮, 无进度提示, 关闭标签页刷新即丢失
- 观察到 localStorage 有自动保存 (`forge-requirement-draft-v1`), 但未暴露给用户, 无恢复入口

**用浏览器 agent 模拟实验的验证**: 单 agent 60 步预算, observe+model 消耗 30-35 步, 剩余不足以走完后续 6 阶段。每次新 agent 从零开始, 无法断点续传。这反映了学员的真实困境 — 一次坐不下来 65 框。

**修复建议**:
1. 在 Dashboard 或页面顶部显示"继续上次进度"入口
2. 每个阶段完成后 toast 提示"已保存"
3. 关闭标签页时 `beforeunload` 提示"你有未保存的进度"

---

## 🟠 P1 — 摩擦级 (新手能推进但困惑、耗时)

### 问题 4: hypothesis 阶段字段数感知混乱

**严重程度**: 中等 — browser agent 在不同轮次分别报告为"10 字段"和"12 字段", 实际只有 7 字段

**代码位置**: [page.tsx:142](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/page.tsx#L142) — DiagnosisForm

**实际字段** (7 个):
```
1. 观察到的现象 *
2. 已知事实
3. 根因假设 *
4. 第一个检查点 *
5. 支持证据
6. 反证条件 *
7. 下一个最小实验
```

**问题描述**: UI 可能把 label + 输入框 + 提示文案视觉上拆成了多个独立元素, 导致字段数感知混乱。新手看了 snapshot 也数不清还有几个字段要填。

**修复建议**: 每阶段顶部加"第 X/Y 步"进度条, 如"假设阶段: 3/7 字段已完成"

---

### 问题 5: plan 阶段部分字段对需求收敛/架构设计等非代码任务无意义

**严重程度**: 中等 — 新手被迫填入无意义内容才能过 gate

**代码位置**: [page.tsx:143](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/page.tsx#L143) — ActionPlanForm

**不匹配的字段**:
| 字段 | 需求收敛任务 | 实际填写 |
|---|---|---|
| `proposedFiles` (拟修改文件清单) | 无代码变更 | "无代码变更。产出: search-requirement-convergence.md" (强行凑内容) |
| `selectedTool` (选择工具) | 无工具可选 | 选了第一个下拉项 (无意义) |
| `impactAnalysis` (影响分析) | 影响分析不同于代码变更 | 语义勉强对齐, 但概念不匹配 |

**修复建议**:
1. 按任务类型分流字段集: 需求收敛/架构设计任务用精简版 plan (去掉文件清单和工具选择)
2. 或至少让非必填字段可跳过, 不要阻塞 gate

---

### 问题 6: act 阶段是代码编辑器, 与非代码类任务完全不匹配

**严重程度**: 中等 — 需求收敛/架构设计/业务分析/CODE READING 等任务类型面对一个用不上的代码编辑器

**代码位置**: [page.tsx:145](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/page.tsx#L145) — Lab 组件

**不匹配的任务类型** (52 个模板中):
- CODE READING (读懂调用链, 无代码变更)
- BUSINESS ANALYSIS (需求收敛, 无代码变更)
- SYSTEM DESIGN (架构设计, 无代码变更)
- AI WRONG ADVICE (挑战 AI 建议, 无代码变更)
- NO-BUG TASK (验证外部依赖, 无代码变更)

这些任务进入 act 阶段后, 面对一个代码编辑器 + 文件树 + 工具面板, 无实际可操作内容。

**修复建议**:
1. 非代码任务 act 阶段改为"行动记录"面板 (textarea, 记录做了什么)
2. 或直接跳过 act 阶段, 从 plan 进 verify

---

### 问题 7: progressive-rail 无"回退到上一步"功能

**严重程度**: 中等 — 填到 Step10 发现 Step3 有问题 → 刷新页面重来

**问题描述**: observe 阶段十步是 progressive-rail (逐屏推进), 但无"回到上一步"按钮。后期步骤发现前期步骤有问题时, 只能刷新页面从头开始。

**修复建议**: progressive-rail 顶部加可点击的步骤导航 (类似多步表单的步骤条)

---

### 问题 8: gate 按钮可能被 viewport 遮挡

**严重程度**: 中等 — 小屏/移动端用户可能无法点击

**浏览器 agent 验证**: 两次报告"按钮在视口外, 点击无效"。需要 scroll 到底部才能点击"批准并锁定 v 1"。

**修复建议**: gate 按钮固定于页面底部 (sticky footer), 或 filling 完成后自动 scroll 到按钮

---

## 🟡 P2 — 结构性设计问题

### 问题 9: 八阶段 65+ 字段对所有任务类型一视同仁, 无类型分流

**严重程度**: 结构性 — 影响所有非代码类任务

**52 个任务模板覆盖的类型**:
- DEBUG LAB — 代码定位修复
- CODE READING — 代码阅读
- CODE MODIFICATION — 代码修改
- AI ORCHESTRATION — Agent 编排
- SYSTEM DESIGN — 架构设计
- BUSINESS ANALYSIS — 需求分析
- AI WRONG ADVICE — 挑战 AI 建议
- NO-BUG TASK — 验证外部依赖

**问题描述**: 所有类型走完全相同的八阶段漏斗 65+ 字段。需求收敛任务和代码 Debug 任务在 model/plan/act 阶段语义完全不同, 但用同一套字段。

**修复建议**:
1. 根据 `task.type` 分流: 代码类任务走完整八阶段, 非代码类任务精简 model/plan/act 阶段
2. 或根据 `task.type` 动态隐藏不匹配字段 (如 BUSINESS ANALYSIS 隐藏 proposedFiles)

---

### 问题 10: NewbieBar 只在 sessions 为空时显示, 一次性使用

**代码位置**: [page.tsx](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/page.tsx) — Dashboard 顶部

```tsx
{sessions.length === 0 && <NewbieBar ... />}
```

**问题描述**:
- 做过一次任务后 NewbieBar 永久消失
- 老用户切到新任务类型 (如从 DEBUG LAB 切到 BUSINESS ANALYSIS) 也需要引导
- 老用户刷新页面后也看不到引导

**修复建议**:
1. NewbieBar 改为按任务类型显示: 首次遇到新任务类型时显示该类型的引导
2. 或加一个常驻的"查看引导"入口 (不依赖 sessions.length)

---

### 问题 11: WorkedExample 默认折叠, 新手可能忽略

**问题描述**: WorkedExample 面板初始状态 `collapsed: true`, 需要手动点击展开。无首次访问自动展开, 无"展开查看推理示范"的醒目提示。新手可能完全不知道这个面板存在。

**修复建议**: 首次访问自动展开, 或加醒目的展开提示 (如闪烁动效/高亮边框)

---

### 问题 12: vagueTerms 检测只覆盖 what/successMetric/constraints 三个字段

**代码位置**: [data.ts:48](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/data.ts#L48)

```typescript
const vague = vagueTerms.filter(word =>
  `${read("what")} ${read("successMetric")} ${read("constraints")}`.includes(word))
```

**不检测的字段**: Step2 Why, Step7 Failure Condition, Step9 Known Facts, Step10 Assumptions 等

**后果**: 如果新手在 Why 步写"优化用户体验", 不会触发 blocker, 但会在 Clarity 维度悄悄扣分 — 新手不知道扣分原因。

**修复建议**: 扩展检测范围到所有 requirement 字段, 或至少在 Clarity 扣分时给出具体扣分项

---

### 问题 13: Clarity 维度扣分过于激进, 且无明细

**代码位置**: [data.ts:57](file:///C:/Users/Lenovo/Documents/Codex/2026-08-14/codex-10-ai-engineering-coach-code/app/data.ts#L57)

```typescript
Clarity: 100 - vague.length * 25 - (what.length >= 8 ? 0 : 40)
```

**扣分规则**:
- 每出现一个模糊词 → -25 分
- What 步不足 8 字符 → -40 分

**后果**: What 步出现 2 个模糊词 → Clarity = 50, What 步不足 8 字符 → Clarity = 10。新手第一版答案大概率 Clarity 极低, 但不知道"为什么扣这么多分、哪一项扣分"。

**修复建议**: 在 Clarity 评分旁展开扣分明细 (如 "模糊词: -25 × 2, What 不足 8 字符: -40")

---

## 🔵 P3 — 体验优化

### 问题 14: 无字段级 placeholder/示例文本

**问题描述**: 所有 textarea 的 placeholder 都是"写下你的……", 无具体示例。新手需要"看到别人怎么填"才能模仿。对比 GitHub Copilot 的 inline suggestion, 这是一个明显的体验差距。

**修复建议**: 每个字段加具体示例 placeholder, 如 Success Metric 的 placeholder: "例: CTR 从 12% 提升至 15%, 2 周 A/B 测试验证"

---

### 问题 15: 无"本阶段预计耗时"提示

**问题描述**: observe 14 框 + model 12 框 + hypothesis 7 框 + plan 13 框 → 新手不知道"我还需要填多久", 容易中途放弃。

**修复建议**: 每阶段顶部加预计耗时, 如 "预计 5-8 分钟"

---

### 问题 16: 无草稿保存提示

**问题描述**: localStorage 有自动保存 (`forge-requirement-draft-v1`), 但用户不知道。关闭标签页时无"你有未保存的进度"提示, 无明显的"恢复上次进度"按钮。

**修复建议**:
1. Dashboard 顶部加"继续上次进度"按钮 (如果检测到 draft 存在)
2. 关闭标签页时 `beforeunload` 提示

---

## 汇总

| 优先级 | 数量 | 核心问题 |
|---|---|---|
| 🔴 P0 | 3 | vagueTerms 误伤+误导 / model 12 字段无引导 / 65+ 框无断点续传 |
| 🟠 P1 | 5 | hypothesis 字段数混乱 / plan 字段不匹配任务类型 / act 代码编辑器不匹配 / 不可回退 / gate 按钮遮挡 |
| 🟡 P2 | 5 | 任务类型无分流 / NewbieBar 不可复用 / WorkedExample 默认折叠 / vagueTerms 检测范围窄 / Clarity 扣分过激 |
| 🔵 P3 | 3 | 无 placeholder / 无耗时提示 / 无草稿保存提示 |
| **合计** | **16** | |

---

## 修复优先级建议

### 第一优先级 (本周, 低风险, 高收益)
1. **vagueTerms 语义化 + 错误提示修正** (问题 1) — 改 data.ts 一个函数, 不改 UI
2. **WorkedExample 字段级引导** (问题 2) — 改 page.tsx WorkedExample 数组, 不改 API/DB
3. **progressive-rail 步骤导航** (问题 7) — 改 page.tsx observe 阶段 UI
4. **Clarity 扣分明细** (问题 13) — 改 data.ts 一个函数

### 第二优先级 (下周, 需设计)
5. **任务类型分流** (问题 9) — 需设计字段集映射, 影响 model/plan/act 三阶段
6. **断点续传** (问题 3) — 需设计恢复 UI + localStorage 读写
7. **NewbieBar 按任务类型显示** (问题 10) — 改 page.tsx 条件判断

### 第三优先级 (后续迭代)
8. act 阶段非代码任务适配 (问题 6)
9. 字段级 placeholder (问题 14)
10. 其余 P2/P3 项

---

> 文档路径: `C:\Users\Lenovo\Documents\Codex\2026-08-14\codex-10-ai-engineering-coach-code\FORGE-新手体验问题清单.md`
> 生成时间: 2026-08-16