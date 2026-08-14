export type Task = {
  id: string; day: string; type: string; title: string; summary: string; duration: number; difficulty: "基础"|"进阶"|"挑战";
  skills: string[]; facts: [string,string][]; criteria: string[]; prompt: string; contextTitle: string; context: string;
  logs: string[]; hints: string[]; patchLabel: string; solution: string; evidencePlaceholder: string; gains: Record<string,number>;
};

export type AcceptanceCheck = {
  groups: string[][];
  failureHint: string;
};

export const tasks: Task[] = [
  { id:"order-confirm",day:"DAILY / 014",type:"DEBUG LAB",title:"订单显示成功，但数据没有更新",summary:"客服发现部分订单确认后仍可修改。定位持久化与权限风险，提交最小修复并给出验收证据。",duration:35,difficulty:"进阶",skills:["Debug","Acceptance Testing","Business Analysis"],facts:[["API","POST /orders/:id/confirm"],["响应","200 OK"],["频率","约 1 / 20"],["影响","状态与权限风险"]],criteria:["订单状态持久化","越权请求被拒绝","重复确认行为明确","原流程无回归"],prompt:"你认为最可能的根因是什么？先检查哪里？什么证据能推翻你的判断？",contextTitle:"api/routes/orders.py",context:`@router.post("/orders/{order_id}/confirm")\nasync def confirm_order(order_id: UUID, current_user=Depends(get_user), db=Depends(get_db)):\n    order = await order_service.get(db, order_id)\n    order.status = OrderStatus.CONFIRMED\n    await db.commit()\n    return {"success": True, "order": order}`,logs:["10:42:11 POST /orders/7f2a/confirm  200 48ms","10:42:11 transaction committed session=8a21","10:42:13 GET /orders/7f2a status=PENDING","10:42:14 user_id=usr_018 owner_id=usr_004"],hints:["不要只盯着 commit；列出这个接口承诺的业务不变量。","检查对象是否存在、owner_id 是否匹配，以及合法状态转换。"],patchLabel:"应用最小修复",solution:`order = await order_service.get(db, order_id)\nif not order or order.owner_id != current_user.id:\n    raise HTTPException(404, "Order not found")\nif order.status != OrderStatus.PENDING:\n    raise HTTPException(409, "Invalid state")\norder.status = OrderStatus.CONFIRMED\nawait db.commit()\nawait db.refresh(order)`,evidencePlaceholder:"写下你的证据链：运行了什么、观察到什么、为什么足以证明修复成立……",gains:{"Debug":5,"Acceptance Testing":7,"Business Analysis":2}},
  { id:"trace-rag",day:"DAILY / 015",type:"CODE READING",title:"读懂一次 RAG 请求的完整调用链",summary:"新人把检索为空归因于模型。请沿调用链定位数据在哪一层丢失，并解释每个模块的职责。",duration:30,difficulty:"基础",skills:["Code Reading","System Design","AI Orchestration"],facts:[["入口","POST /chat"],["症状","sources = []"],["模型","响应正常"],["范围","6 个模块"]],criteria:["还原完整调用链","区分检索与生成职责","找出空结果分支","给出可观测性建议"],prompt:"不运行代码时，你如何预测数据流？哪一层最值得先读，为什么？",contextTitle:"services/chat_service.ts",context:`export async function answer(query: string) {\n  const intent = await supervisor.route(query)\n  const chunks = await retriever.search(intent.query)\n  const context = reranker.topK(chunks, 5)\n  return generator.complete({ query, context })\n}`,logs:["route intent=knowledge_query confidence=.94","search namespace=school-docs filters={year:2026}","vector hits=0 latency=12ms","generator context_tokens=0 response=200"],hints:["先区分控制流与数据流，再标记每一步输入输出。","检索使用了 namespace 和 filter；哪一个最可能让召回变成 0？"],patchLabel:"标注调用链",solution:`POST /chat → supervisor.route → retriever.search\n→ vector DB(namespace + filters) → reranker.topK\n→ generator.complete → response\n\nRoot cause candidate: an over-restrictive year filter makes vector hits = 0.\nObservability: log namespace, filters, vector hit count and context tokens.`,evidencePlaceholder:"用自己的话解释调用链，并说明哪条日志支持你的结论……",gains:{"Code Reading":7,"System Design":3,"AI Orchestration":3}},
  { id:"permission-change",day:"DAILY / 016",type:"CODE MODIFICATION",title:"给导出功能增加经理审批",summary:"业务要求金额超过 10 万的导出必须由经理审批。请控制改动范围，并明确回归风险。",duration:40,difficulty:"进阶",skills:["Code Modification","Business Analysis","Acceptance Testing"],facts:[["入口","POST /exports"],["角色","analyst / manager"],["阈值","¥100,000"],["要求","保留原小额流程"]],criteria:["阈值规则准确","审批状态可追踪","原小额导出无回归","权限不能前端绕过"],prompt:"这个需求会影响哪些文件和边界？哪些逻辑必须放在服务端？",contextTitle:"services/export_service.ts",context:`export async function createExport(user, request) {\n  const job = await exportRepo.create({\n    ownerId: user.id,\n    amount: request.amount,\n    status: "queued"\n  })\n  return queue.publish(job)\n}`,logs:["analyst creates export amount=150000","job status=queued","worker started after 31ms","audit approval_id=null"],hints:["先列出状态变化，不要把审批仅实现成一个 if。","需要 pending_approval 状态、服务端授权与审计证据。"],patchLabel:"生成变更草案",solution:`const needsApproval = request.amount >= 100_000\nconst status = needsApproval ? "pending_approval" : "queued"\nconst job = await exportRepo.create({ ownerId:user.id, amount:request.amount, status })\nif (!needsApproval) await queue.publish(job)\nawait audit.record({ jobId:job.id, action:"export_created", status })\nreturn job`,evidencePlaceholder:"列出改动文件、回归测试和权限验证证据……",gains:{"Code Modification":7,"Business Analysis":4,"Acceptance Testing":3}},
  { id:"agent-timeout",day:"DAILY / 017",type:"AI ORCHESTRATION",title:"阻止 Agent 在工具调用中无限循环",summary:"Supervisor 重复调用搜索工具直到超时。请设计终止条件、预算和降级策略。",duration:45,difficulty:"挑战",skills:["AI Orchestration","System Design","Debug"],facts:[["超时","120 秒"],["调用","search × 18"],["结果","重复 87%"],["影响","成本与延迟"]],criteria:["最大步数限制","重复结果检测","超时降级响应","保留执行轨迹"],prompt:"如果不能依赖模型自己停下来，系统层需要哪些硬约束？",contextTitle:"agents/supervisor.ts",context:`while (!state.done) {\n  const next = await model.plan(state)\n  const result = await tools.call(next.tool, next.args)\n  state.messages.push(result)\n}\nreturn state.answer`,logs:["step=14 tool=search signature=8ba1","step=15 tool=search signature=8ba1","step=16 tool=search signature=8ba1","budget tokens=18840 elapsed=117s"],hints:["把预算当作系统资源，而不是提示词建议。","组合 maxSteps、deadline、重复签名检测和 fallback。"],patchLabel:"应用编排护栏",solution:`const budget = { maxSteps: 8, deadline: Date.now()+30_000 }\nconst seen = new Set<string>()\nwhile (!state.done && state.step < budget.maxSteps && Date.now() < budget.deadline) {\n  const next = await model.plan(state)\n  const signature = stableHash(next)\n  if (seen.has(signature)) return fallback(state, "repeated_tool_call")\n  seen.add(signature)\n  state.messages.push(await tools.call(next.tool, next.args))\n  state.step++\n}\nreturn state.done ? state.answer : fallback(state, "budget_exhausted")`,evidencePlaceholder:"说明终止条件、降级策略，以及如何证明不会再无限循环……",gains:{"AI Orchestration":8,"System Design":5,"Debug":3}},
  { id:"design-notify",day:"DAILY / 018",type:"SYSTEM DESIGN",title:"设计可靠的批量通知系统",summary:"活动上线后需在 10 分钟内通知 50 万用户，同时避免重复发送，并能追踪失败。",duration:50,difficulty:"挑战",skills:["System Design","Business Analysis","Acceptance Testing"],facts:[["规模","500,000 用户"],["SLA","10 分钟"],["渠道","Email + Push"],["约束","不可重复发送"]],criteria:["异步削峰","幂等与重试","失败可观测","渠道隔离"],prompt:"先定义业务成功，再选组件。吞吐、幂等和失败恢复分别由谁负责？",contextTitle:"architecture/current.md",context:`Campaign API\n  → Notification Service\n    → Email Provider\n    → Push Provider\n\nCurrent behavior: synchronous fan-out in one request.`,logs:["campaign users=500000","request timeout=30s","email provider rate_limit=429","retry duplicated 12,481 messages"],hints:["把接收请求、生成任务、渠道发送和状态追踪拆成独立边界。","使用队列削峰；用 campaign_id + user_id + channel 做幂等键。"],patchLabel:"生成架构方案",solution:`Campaign API → Fan-out Worker → Durable Queue\n  → Email Consumer → Provider\n  → Push Consumer → Provider\n  → Delivery Store + DLQ\n\nIdempotency key: campaign_id:user_id:channel\nRetry: exponential backoff + jitter; terminal failures → DLQ`,evidencePlaceholder:"描述关键组件、数据流、幂等键、重试和验收指标……",gains:{"System Design":8,"Business Analysis":4,"Acceptance Testing":3}},
  { id:"discover-intake",day:"DAILY / 019",type:"BUSINESS ANALYSIS",title:"把“做一个 AI 助手”问成可验收需求",summary:"教务团队提出模糊需求。你需要识别用户、流程、规则、风险与成功指标，再决定是否使用 Agent。",duration:35,difficulty:"进阶",skills:["Business Analysis","AI Orchestration","Delivery"],facts:[["用户","教务老师"],["现状","Excel + 微信"],["痛点","重复答疑"],["风险","错误通知学生"]],criteria:["识别关键角色","还原当前流程","定义业务规则","形成可量化指标"],prompt:"不要问“想做什么功能”。你会用哪五个问题还原真实工作？",contextTitle:"interview/notes.md",context:`Stakeholder: 教务主任\nRequest: “想做一个能回答所有问题的 AI 助手。”\nKnown: policies change every semester; sensitive student data exists.`,logs:["weekly questions≈1200","repeat questions≈68%","policy sources=14 documents","final answer currently confirmed by teacher"],hints:["从谁在何时做什么、数据在哪、谁确认、出错后果开始。","先设计检索+引用+人工确认，不要默认使用自主 Agent。"],patchLabel:"生成需求框架",solution:`用户：教务老师（维护）/ 学生（查询）/ 主任（确认）\n流程：提问 → 检索政策 → 引用来源 → 低置信度转人工\n规则：按学期生效；敏感数据按角色隔离；通知须人工确认\n指标：重复问题人工处理量 -50%；引用准确率 ≥95%；零越权`,evidencePlaceholder:"写出角色、现状流程、业务规则、风险、成功指标与验收条件……",gains:{"Business Analysis":8,"AI Orchestration":3,"Delivery":4}},
];

export const baseSkills: Record<string,number> = {"Code Reading":72,"Code Modification":64,"Debug":61,"System Design":49,"Acceptance Testing":54,"Business Analysis":68,"AI Orchestration":57,"Delivery":52};

// Each acceptance criterion is backed by one or more semantic token groups.
// A group passes when any of its tokens appears; every group must pass.
export const taskChecks: Record<string, AcceptanceCheck[]> = {
  "order-confirm": [
    { groups:[["commit","save","持久化"],["refresh","reload","重新读取"]], failureHint:"确认写入事务后重新读取对象，证明状态真的落库。" },
    { groups:[["owner_id","ownerid","权限"],["current_user","currentuser","403","404"]], failureHint:"在服务端校验资源归属，不能只依赖前端隐藏按钮。" },
    { groups:[["pending"],["409","invalid state","状态转换"]], failureHint:"为重复确认或非法状态定义明确响应。" },
    { groups:[["order_service","order"],["commit","test","验收"]], failureHint:"保留原确认流程，并留下可回归验证的入口。" },
  ],
  "trace-rag": [
    { groups:[["supervisor"],["retriever"],["reranker"],["generator"]], failureHint:"把入口到生成响应的每一段调用链都标出来。" },
    { groups:[["retriever","检索"],["generator","生成"]], failureHint:"明确检索负责找资料、生成负责组织答案。" },
    { groups:[["filter","year","namespace"],["0","empty","空"]], failureHint:"指出哪个过滤分支让检索结果变为空。" },
    { groups:[["log","日志","trace","observability"],["hit","命中","context"]], failureHint:"补充能观察检索命中和上下文大小的信号。" },
  ],
  "permission-change": [
    { groups:[["100_000","100000"],["pending_approval"]], failureHint:"把金额阈值映射到待审批状态。" },
    { groups:[["pending_approval"],["audit","approval"]], failureHint:"审批状态需要持久化并可审计。" },
    { groups:[["!needsapproval","else","小额"],["queue.publish","queued"]], failureHint:"保留小额导出直接入队的原流程。" },
    { groups:[["user","manager","role","权限"],["service","server","服务端","audit"]], failureHint:"权限判断必须存在于服务端边界。" },
  ],
  "agent-timeout": [
    { groups:[["maxsteps","max_steps"],["step"]], failureHint:"加入独立于模型的最大步数硬限制。" },
    { groups:[["seen","set"],["signature","hash"],["repeat","重复"]], failureHint:"记录工具调用签名并拦截重复结果。" },
    { groups:[["deadline","timeout"],["fallback","降级"]], failureHint:"超时后返回可解释的降级结果。" },
    { groups:[["messages","trace","轨迹"],["reason","budget_exhausted","repeated_tool_call"]], failureHint:"保留终止原因与执行轨迹，便于复盘。" },
  ],
  "design-notify": [
    { groups:[["queue","队列"],["worker","consumer"]], failureHint:"使用队列与消费者把同步扇出改为异步削峰。" },
    { groups:[["idempotency","幂等"],["campaign_id"],["user_id"],["channel"]], failureHint:"定义覆盖活动、用户和渠道的幂等键。" },
    { groups:[["retry","重试"],["dlq","失败队列"]], failureHint:"设计有上限的重试和终态失败去向。" },
    { groups:[["email"],["push"],["consumer","provider"]], failureHint:"将 Email 与 Push 的消费链路隔离。" },
  ],
  "discover-intake": [
    { groups:[["教务","teacher"],["学生","student"],["主任","director"]], failureHint:"至少识别维护者、使用者和确认者。" },
    { groups:[["提问","question"],["检索","retrieve"],["人工","human"]], failureHint:"还原从提问、检索到人工兜底的当前/目标流程。" },
    { groups:[["学期","semester"],["敏感","权限","role"]], failureHint:"写清政策时效和敏感数据权限规则。" },
    { groups:[["%","准确率","accuracy","-50","零越权"]], failureHint:"至少给出一个可量化成功指标。" },
  ],
};
