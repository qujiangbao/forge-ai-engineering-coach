# FORGE 项目接手文档

> 最后更新：2026-08-16（Asia/Shanghai）  
> 当前状态：生产环境已上线，入门/精通双模式改造完成，核心流程、PWA、数据库与管理员题库接口可用  
> 本文不包含任何密钥、数据库密码或令牌明文

## 1. 项目身份

| 项目 | 当前值 |
|---|---|
| 软件名称 | FORGE — AI Engineering Coach |
| 产品类型 | AI 原生工程师 / FDE 项目制训练软件 |
| 本地源码 | `C:\Users\Lenovo\Documents\Codex\2026-08-14\codex-10-ai-engineering-coach-code` |
| 正式域名 | <https://forge.quijiang.cn> |
| 稳定 Vercel 地址 | <https://forge-ai-engineering-coach.vercel.app> |
| Vercel 团队 | `quijiang1` |
| Vercel 项目 | `forge-ai-engineering-coach` |
| Vercel Project ID | `prj_8aJRO5oaGs1ufQMC1GM8n7PavFF2` |
| 最新生产部署 | `dpl_5RjEdXsb6WGgjsajBWwtQ891ectC` |

### 项目隔离红线

- 这是一个独立软件，不是"上岸计划"。
- 不得使用或修改 Vercel 项目 `shangan-plan-quijiang`。
- 不得把本项目的环境变量、域名或数据库迁移到其他项目。
- 原 Sites 部署和旧域名配置尚未要求删除；没有新的明确授权时保持不动。

## 2. 产品定位与不可破坏原则

FORGE 不是慕课平台。核心闭环是：

> 系统每天给出真实工程任务 → 学员先判断 → AI 只给有限提示 → 学员修改或 Debug → 系统自动测试 → AI 复盘思考 → 更新能力雷达

核心能力方向：

- AI Engineering Coach
- Code Reading / Code Modification / Debug Lab
- System Design / Acceptance Testing / Business Analysis
- AI Orchestration / Skill Matrix / Project-Based Learning
- Requirement Quality / Engineering Judgment / Engineering Ownership
- Scope Control / Cognitive Load Management / Review Capacity

必须保留的产品原则：

- Four-Layer Funnel：Requirement → Solution → Implementation → Acceptance
- Requirement Lock 与 Human Approval Gate
- AI as One Tool，最终决定属于人类
- Evidence First，没有证据不能宣布完成
- Plan Before Code，Review Before Continue
- Minimal Change，禁止顺手重构和范围漂移
- AI 生成速度不得超过人的理解与审查能力

## 3. 当前功能基线

### 双模式训练体系（2026-08-16 新增）

| 模式 | 默认用户 | 流程 | 回答量 | 目标时长 |
|---|---|---|---|---|
| 入门模式 | 新用户、L1–L2 | 四层漏斗（Define → Design → Build → Act → Prove） | 15 个核心回答 + 4 项自动验收 | 10–15 分钟 |
| 精通模式 | 熟练用户、L3–L5 | 完整八阶段工程闭环 | 约 35–65 项 | 30–60 分钟 |

两种模式共享任务库、每日推荐、用户档案、草稿断点续传、自动验收、能力雷达和 Human Gate。

**入门模式 4 层配置**（定义在 `starterLayers` 常量）：

| 层 | 中文 | 必答字段 |
|---|---|---|
| Define | 把任务说清楚 | 谁使用或验收、最终要改变什么状态、什么结果算成功、到哪里取得证据 |
| Design | 先判断再行动 | 当前事实或系统状态、最可能的原因或方案、先检查什么最有信息价值、什么证据会推翻判断 |
| Build | 执行一个小动作 | 本轮唯一范围、准备执行什么动作或工具、预期看到什么结果 |
| Act | 自动验收 | 运行 4 项自动验收测试，全部通过后才能进入 Prove |
| Prove | 用证据结束任务 | 实际观察到了什么、哪条证据证明结论、还有什么风险、下次遇到同类问题第一步做什么 |

**模式选择规则**：
- 新用户默认入门模式；L1–L2 推荐入门；L3 记住上次选择；L4–L5 推荐精通
- 通过第一个 Gate 后模式锁定，防止中途切换绕过要求
- 完成 3 次入门训练且平均分 ≥ 80 后显示一次升级提示

**任务类型分类**（`TaskProfile`，类型系统已就绪，UI 尚未接入）：
- `code-change`：Debug、Code Modification、AI Orchestration
- `code-understanding`：Code Reading
- `design-analysis`：System Design、Business Analysis
- `review-verification`：AI Wrong Advice、No-Bug
- 注意：`getTaskProfile()` 函数已在 `data.ts` 实现，但页面尚未根据 TaskProfile 切换工作台。当前所有任务类型仍共用同一套 Lab 界面。

### 全流程断点续传（2026-08-16 新增）

- `app/training-draft.ts` 模块实现草稿保存/加载/清除
- 输入防抖自动保存（1.5 秒静默后自动保存），UI 显示"已保存"状态指示器
- 阶段切换时立即保存，离开页面时通过 `beforeunload` 保底保存
- 自动保存训练状态（阶段、字段数据、工作区、Gate 历史等）
- Dashboard 显示"继续训练"入口，支持跨会话恢复
- 草稿版本化（v2），兼容旧版本草稿（v1 默认 mastery）
- 完成后自动清除草稿，意外关闭不丢进度

### 新手引导（2026-08-15 新增）

- WorkedExample 推理示范面板：展示参考解答的推理过程
- NewbieBar 新手引导条：首次访问推荐 L2 任务 + 入门模式
- 模糊词检测优化：增加上下文感知豁免，减少误判

### 既有功能

- 52 个任务模板，按日期、能力弱项和最近训练记录生成 260+ 场景变体。
- 每日推荐 3 个任务，避免近期重复。
- 37 维能力矩阵、能力雷达、XP、连续训练天数和训练档案。
- 四层工程漏斗以及八阶段推理过程：Observe、Model、Hypothesize、Plan、Act、Verify、Update、Learn。
- 入门模式五步闭环：Define → Design → Build → Act（自动验收）→ Prove（最终人工批准）。
- Requirement Quality 六维评分：Clarity、Completeness、Consistency、Feasibility、Testability、Evidence。
- 十步需求收敛：Who、Why、What、Input / Output、Constraint、Success Metric、Failure Condition、Evidence、Known / Unknown、Assumptions / Conflicts。
- 当前阻塞优先展示，其余问题默认折叠。
- 有限提示、工具选择、代码工作区、自动验收、Diff 审查和证据链复盘。
- 需求草稿、当前任务和当前步骤刷新恢复。
- 训练记录、能力增量与动态题库持久化。
- 管理员可发布真实工程任务到动态题库。
- PWA 清单、Service Worker、Apple Web App 元数据及移动端安全区支持。

## 4. 技术栈

| 层 | 技术 |
|---|---|
| Web 框架 | Next.js 16.3.1 App Router |
| UI | React 19.2.6、TypeScript 5.9、全局 CSS、Tailwind PostCSS 基础设施 |
| 运行时 | Node.js 24.x |
| 数据访问 | Drizzle ORM 0.45.2 |
| 数据库 | Neon PostgreSQL / Vercel Marketplace |
| 托管 | Vercel，项目根目录为 `.` |
| PWA | `app/manifest.ts`、`app/pwa-register.tsx`、`public/sw.js` |
| 测试 | Node Test Runner + TypeScript strip types |

没有额外的客户端状态库、组件库或测试框架。继续维护时优先复用现有组件与数据源，不要为小改动引入新依赖。

## 5. 代码导航

| 文件 | 职责 |
|---|---|
| `app/page.tsx` | 单页产品界面、训练状态机、双模式流程（入门 5 步 Define→Design→Build→Act→Prove + 精通 8 阶段）、Dashboard、草稿恢复、输入防抖自动保存、模式选择/锁定和提交控制 |
| `app/data.ts` | 任务类型、52 个模板、动态变体、37 维能力矩阵、十步需求配置、`TrainingMode`/`TaskProfile` 类型、`starterLayers` 入门模式配置和统一评分逻辑 |
| `app/training-draft.ts` | 全流程草稿保存/加载/清除/版本迁移，支持 `trainingMode` 字段和跨会话断点续传 |
| `app/globals.css` | 全站视觉、三栏工作区、Requirement Quality、十步导航、双模式样式（模式选择/锁定/升级提示/4 层阶段条/保存状态指示器）和响应式断点 |
| `app/api/progress/route.ts` | 用户身份、训练进度读取、双模式校验（`validStarter` 含 4 项自动测试结果校验）、评分（入门模式权重 0.6）、能力增量和重复提交保护 |
| `app/api/tasks/route.ts` | 动态题库读取和新任务发布；管理员密钥验证、超时与禁止缓存 |
| `app/api/tasks/[id]/route.ts` | 动态任务发布状态修改和删除接口 |
| `app/chatgpt-auth.ts` | 旧 Sites / ChatGPT 身份兼容；Vercel 环境不可用时回退匿名身份 |
| `db/schema.ts` | PostgreSQL 表结构 |
| `db/index.ts` | 数据库连接入口 |
| `drizzle-vercel/` | 当前 PostgreSQL 迁移历史 |
| `public/sw.js` | PWA 应用壳缓存；API 请求明确不缓存 |
| `tests/training-rules.test.mjs` | 33 项回归测试：任务规则、能力矩阵、需求评分、模糊词检测、草稿系统、双模式校验和 UI 关键路径 |

`README.md` 中"六个任务、八维矩阵"的描述属于早期 MVP 文案，当前真实基线以本接手文档、`app/data.ts` 和自动测试为准。

## 6. 数据与身份

### 数据表

| 表 | 用途 |
|---|---|
| `profiles` | 用户 XP、连续训练和能力矩阵 |
| `training_sessions` | 旧版训练记录；为兼容历史数据保留 |
| `task_attempts` | 新版连续训练记录、漏斗证据、评分、提示和 AI 判断数据；`diagnosis_json` 记录 `trainingMode` |
| `skill_events` | 每次训练带来的能力增量事件 |
| `task_catalog` | 管理员发布的动态任务 |

不要删除 `training_sessions`。读取接口会把旧记录与新 `task_attempts` 合并，以保持用户历史可见。

### 用户身份

1. 能读取 ChatGPT / Sites 用户头时使用兼容身份。
2. 普通 Vercel 访问回退到匿名 Cookie `forge-user-id`。
3. Cookie 为 HttpOnly、SameSite=Lax，生产环境启用 Secure，有效期一年。

### 本地浏览器状态

- `forge-active-requirement-v1`：当前训练任务。
- `forge-training-draft:v2:<variantId>`：全流程草稿（阶段、字段数据、工作区、Gate 历史、`trainingMode`）。
- `forge-submission-v1:<variantId>`：本次提交幂等标识。

需求锁定后修改任意字段会自动 Reopen、递增版本并撤销后续批准。

### 重复提交保护

- 客户端用 `completeInFlight` 阻止连续点击。
- 每次训练在浏览器内生成 `submissionId`。
- 服务端把 `_submissionId` 写入 `review_json`，重复请求不会再次增加 XP 或能力事件。
- 当前没有为 `submissionId` 增加数据库唯一索引，以遵守"不修改 Schema"的既定范围。极端的跨设备并发提交仍应在未来通过数据库唯一约束彻底封闭。

## 7. 环境变量

本地参考文件：`.env.example`。

| 变量 | 必需 | 用途 |
|---|---|---|
| `DATABASE_URL` | 是 | Neon PostgreSQL 连接 |
| `FORGE_ADMIN_KEY` | 生产管理员功能需要 | 动态题库读写验证 |

Vercel Marketplace 还会提供 `POSTGRES_URL`、`POSTGRES_PRISMA_URL`、`PGHOST` 等派生变量。应用主要依赖 `DATABASE_URL`。

安全要求：

- 不在文档、Git、截图、日志或聊天中粘贴密钥值。
- `FORGE_ADMIN_KEY` 在 Vercel 中应保持 Sensitive。
- 管理员密钥只保存在当前 React 页面内存，不写入 localStorage。
- 如果密钥遗失，应在 Vercel 中轮换变量并重新部署，不要尝试从生产页面读取。

## 8. 本地开发

要求 Node.js 24.x。进入项目目录后执行：

```powershell
npm install
npm run dev
```

默认访问：<http://localhost:3000>。

注意：这台机器曾有旧开发进程占用 3000 端口并继续提供旧 CSS。若出现"源码已修改但页面样式未变化"，先确认端口对应的进程，再完全重启开发服务器。正式包可使用独立端口验证：

```powershell
npm run build
npm run start -- --port 3100
```

### 数据库迁移

```powershell
npm run db:generate
npm run db:migrate
```

或者使用项目 README 中的显式 Drizzle 命令。执行迁移前必须先审查 SQL、备份策略、向后兼容和回滚方案。当前所有改动没有修改数据库 Schema。

## 9. 必须执行的质量门

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

截至 2026-08-16：

- 33 项自动测试通过（含 9 项双模式新增测试）。
- ESLint 通过，0 错误 0 警告。
- TypeScript 类型检查通过。
- Next.js 正式构建通过。
- 构建包含 `/`、`/api/progress`、`/api/tasks`、`/api/tasks/[id]`、`/manifest.webmanifest` 和 `/robots.txt`。

涉及页面布局时还要检查：

- 390、760、1366、1440、1920 像素宽度。
- 页面整体无横向滚动。
- 入门模式首屏 ≤ 4 个必答项。
- 精通模式八阶段完整保留。
- 模式选择开关和锁定状态正常显示。
- 中文长文本不覆盖、不溢出。
- 刷新后任务、步骤、模式和输入恢复。
- 浏览器控制台无应用错误。

## 10. 部署与发布

仓库已通过 `.vercel/project.json` 链接到正确的独立项目。发布前再次核对项目名，避免误部署：

```powershell
npx --yes vercel@latest project inspect forge-ai-engineering-coach --scope quijiang1
```

推荐流程：

1. 本地执行全部质量门。
2. 创建无缓存预览部署。
3. 验证预览构建状态与关键资源。
4. 晋升生产，或直接在紧急修复时执行无缓存生产部署。
5. 检查正式域名、API、PWA 和生产日志。

```powershell
npx --yes vercel@latest deploy --force --yes --scope quijiang1
npx --yes vercel@latest deploy --prod --force --yes --scope quijiang1
```

生产验证：

```powershell
npx --yes vercel@latest inspect <deployment-id> --scope quijiang1 --wait
npx --yes vercel@latest logs --project forge-ai-engineering-coach --environment production --level error --since 30m --scope quijiang1
```

域名 `forge.quijiang.cn` 已绑定并启用 HTTPS。不要修改 `shangan-plan-quijiang` 的域名或 DNS。

## 11. 已解决的重要问题

### 生产 CSS 缺失

症状：生产页面 HTML 与组件已更新，但 Requirement Quality、十步导航和 Stage Gate 样式缺失。

根因：Vercel 生产部署复用了旧 CSS 构建产物。本地新 CSS 包含关键选择器，旧生产 CSS 不包含。

处理：

- 重构相关样式为稳定的静态选择器。
- 使用 `--force` 跳过 Vercel 构建缓存。
- 生产 CSS 已验证包含 `.requirement-health`、`.progressive-rail`、`.current-blocker` 和 `.quality-blockers`。

### Requirement Quality 信息层级

- Quality 与 Blocking 数量已分离。
- 六个维度为独立卡片。
- 只突出当前步骤和当前阻塞。
- 其他阻塞用 `<details>` 默认折叠。
- 分数统一限制在 0–100，Blocking Count 为非负整数。
- 空字符串和常见占位文字不会提高完整度。

### 管理员验证永久等待

症状：输入密钥后页面长期停留在"正在验证并载入题库…"。

处理：

- 客户端请求 12 秒超时，异常后恢复按钮。
- 密钥错误、网络失败、数据库不可用和超时分别给出可操作提示。
- 服务端动态题库查询 8 秒超时。
- 管理员响应设置 `Cache-Control: private, no-store, max-age=0`。
- `/api/tasks?mode=catalog` 无效密钥可在约 2 秒内返回 401。

### 模糊词字面匹配误伤新手

症状：新手在 What 步引用题目中的"更智能"等模糊词即被 blocker 拦截，且提示指向错误字段。

处理：

- 扩展检测范围，返回真实字段名。
- 增加上下文感知豁免：当答案已包含基线/目标值/时间窗等量化指标时，包含模糊词不再扣分。
- 返回值增加 `clarityDeductions` 扣分明细。

### 新手引导不足

症状：新手面对 65+ 输入框的八阶段流程不知从何下手。

处理：

- 新增 WorkedExample 推理示范面板，展示参考解答的推理过程。
- 新增 NewbieBar 新手引导条，首次访问推荐 L2 任务 + 入门模式。
- 实现入门/精通双模式，入门模式仅 4 层 15 个核心回答。

### 训练进度丢失

症状：关闭页面或刷新后训练进度全部丢失，无法跨会话继续。

处理：

- 新建 `app/training-draft.ts` 模块，实现全流程状态保存和恢复。
- Dashboard 增加"继续训练"入口。
- 每次输入自动保存，完成后自动清理。
- 草稿版本化（v2），兼容旧版本草稿。

### 入门模式跳过 Act 和自动验收（2026-08-16 修复）

症状：入门模式 Build 完成后直接跳到 Learn，没有进入 Act 阶段、代码编辑器或自动测试。

处理：

- `advanceStarterBuild` 改为跳转到 `"act"` 阶段而非 `"learn"`。
- 新增 `advanceStarterAct` 函数，要求 4 项自动测试全部通过后才允许进入 Prove。
- 服务端 `validStarter` 增加 `testResults` 校验：必须恰好 4 项且每项 `passed === true`。
- 新增测试用例覆盖空结果、数量不足、存在失败项等场景。

### 草稿"每次输入自动保存"未实现（2026-08-16 修复）

症状：草稿仅在阶段切换和离开页面时保存，输入过程未保存。

处理：

- 新增输入防抖 `useEffect`，监听所有表单字段变化，1.5 秒静默后自动调用 `saveDraft`。
- 新增 `draftSavedAt` 状态和 `.draft-save-indicator` CSS 样式，UI 显示"已保存"提示。
- 阶段切换时立即保存，`beforeunload` 保底保存。

### 精通升级提示统计不准确（2026-08-16 修复）

症状：`starterCompleted` 和 `starterAvg` 统计所有训练记录，可能错误提示精通模式用户切换。

处理：

- 通过解析 `diagnosis.trainingMode` 过滤，仅统计入门模式训练记录。
- 升级提示仅在 `starterCompleted >= 3 && starterAvg >= 80 && trainingMode === "starter"` 时显示。

## 12. 当前工作区状态

当前分支：`main`  
基准提交：`c555c3a2231533aa4407f811568306ad8fdb414b`（Add four-layer engineering funnel）

以下生产代码修改已经部署，但本地仍是未提交状态：

- `app/page.tsx` — 双模式 UI、入门 Act 闭环、输入防抖自动保存、草稿恢复、新手引导、升级提示统计修正
- `app/data.ts` — 双模式类型、`starterLayers` 配置、`TaskProfile` 分类
- `app/training-draft.ts` — 全流程草稿模块（新建）
- `app/globals.css` — 双模式样式、新手引导样式、保存状态指示器
- `app/api/progress/route.ts` — 双模式服务端校验与评分，`validStarter` 含自动测试结果校验
- `tests/training-rules.test.mjs` — 33 项测试（含 9 项双模式新增 + 入门测试校验用例）

接手人第一步应运行 `git status` 和 `git diff`。不要使用 `git reset --hard`、`git checkout --` 或其他命令覆盖这些已部署但未提交的修改。确认差异、测试通过后再创建正式提交。

## 13. 已知风险与建议优先级

### P1

- 为 `submissionId` 增加数据库级唯一约束，彻底防止跨设备并发重复提交。此项属于 Schema 变更，必须单独做迁移审批和回滚设计。
- 将 `app/page.tsx` 中的大型单文件逐步拆分，但只能按功能小批次进行，不能重写页面架构。
- 模糊词检测从字面匹配升级为语义检测：判断答案是否把模糊词具体化了，而非是否出现模糊词。
- 考虑任务类型分流：`getTaskProfile()` 和 `TaskProfile` 类型已在 `data.ts` 实现，但页面尚未根据任务类型切换工作台。需求收敛/代码 Debug/架构设计仍需使用不同的阶段字段集，避免非代码任务出现无意义的文件清单和代码编辑器。

### P2

- 更新 `README.md` 的早期 MVP 数字，使其与 52 个模板、37 维矩阵和双模式体系一致。
- 为管理员题库接口增加集成测试，包括正确密钥、错误密钥、数据库超时与重复发布。
- 为生产页面建立稳定的视觉回归截图基线。
- WorkedExample 八阶段每步增加"避坑提示"。
- model/hypothesis/plan 阶段增加字段级引导。

### 不要顺手做

- 不升级 Next.js、React、Drizzle 或数据库依赖。
- 不替换状态管理、CSS 体系或数据库。
- 不删除旧训练表、旧部署或旧身份兼容逻辑。
- 不在没有验收标准时增加新功能。
- 不增加第三种"标准模式"，先把入门和精通两个入口做清楚。

## 14. 接手后的首轮检查清单

- [ ] 确认当前目录与 Vercel 项目均为 `forge-ai-engineering-coach`。
- [ ] 阅读 `git diff`，保留当前未提交修改。
- [ ] 创建 `.env.local`，但不要把密钥提交到 Git。
- [ ] 运行 lint、typecheck、33 项测试和正式构建。
- [ ] 打开正式域名，验证首页和今日训练。
- [ ] 验证入门模式：Dashboard 模式开关 → 选择入门 → 任务卡片显示 4 层 Define/Design/Build/Prove → 每层 ≤ 4 个必答项。
- [ ] 验证入门模式 Act 闭环：Build 后进入 Act → 运行 4 项自动验收 → 全部通过后进入 Prove → 勾选 Final Human Approval 提交。
- [ ] 验证入门模式验收阻断：Act 阶段未通过全部测试时无法进入 Prove。
- [ ] 验证精通模式：切换精通 → 完整八阶段 Obser/Model/Hypothesize/Plan/Act/Verify/Update/Learn。
- [ ] 验证模式锁定：进入 Define 后锁定，不可切换模式。
- [ ] 验证草稿恢复：填充部分字段后刷新页面 → Dashboard 显示"继续训练" → 恢复后阶段和字段数据完整。
- [ ] 验证 `/api/progress` 返回 PostgreSQL 持久化状态。
- [ ] 用管理员密钥验证题库载入；不要在截图中暴露密钥。
- [ ] 检查 PWA manifest 与 `/sw.js` 返回 200。
- [ ] 检查最近 30 分钟生产错误日志。
- [ ] 所有验收通过后停止修改，避免无限优化。

## 15. Definition of Done

一次后续修改只有同时满足以下条件才算完成：

1. 需求范围、拟修改文件和影响分析明确。
2. 没有未经批准的新依赖、数据库迁移或架构变化。
3. lint、类型检查、33 项测试和正式构建全部通过。
4. 目标宽度与主要交互经过实际验证。
5. 生产域名、API、PWA 和日志检查通过。
6. 提供可复现证据、风险说明和回滚路径。
7. 验收标准通过后停止继续修改。