"use client";

import { useMemo, useState } from "react";

type Phase = "diagnose" | "work" | "result";
type Panel = "code" | "logs" | "tests";

const initialCode = `@router.post("/orders/{order_id}/confirm")
async def confirm_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await order_service.get(db, order_id)

    # Confirm the order and persist the change
    order.status = OrderStatus.CONFIRMED
    await db.commit()

    return {"success": True, "order": order}`;

const fixedCode = `@router.post("/orders/{order_id}/confirm")
async def confirm_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await order_service.get(db, order_id)
    if not order or order.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=409, detail="Invalid order state")

    order.status = OrderStatus.CONFIRMED
    await db.commit()
    await db.refresh(order)

    return {"success": True, "order": order}`;

const skills = [
  ["Code Reading", 72, 3],
  ["Debug", 61, 5],
  ["Acceptance Testing", 54, 7],
  ["Business Analysis", 68, 2],
  ["System Design", 49, 1],
] as const;

export default function Home() {
  const [phase, setPhase] = useState<Phase>("diagnose");
  const [panel, setPanel] = useState<Panel>("code");
  const [diagnosis, setDiagnosis] = useState("");
  const [code, setCode] = useState(initialCode);
  const [hintLevel, setHintLevel] = useState(0);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");

  const codeLines = useMemo(() => code.split("\n").length, [code]);

  function startWork() {
    if (diagnosis.trim().length < 16) {
      setNotice("先写下你的判断：风险在哪里，你准备用什么证据验证？");
      return;
    }
    setNotice("");
    setPhase("work");
  }

  function requestHint() {
    if (hintLevel >= 2) return;
    setHintLevel((value) => value + 1);
  }

  function applyPatch() {
    setCode(fixedCode);
    setNotice("修复草案已应用。现在用验收测试证明它，而不是相信它。");
  }

  function runTests() {
    setRunning(true);
    setNotice("");
    setPanel("tests");
    window.setTimeout(() => {
      setRunning(false);
      setPhase("result");
    }, 1200);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Forge 首页">
          <span className="brand-mark">F</span>
          <span>FORGE</span>
        </a>
        <nav aria-label="主导航">
          <button className="nav-active">今日训练</button>
          <button>能力雷达</button>
          <button>工程日志</button>
        </nav>
        <div className="streak"><span>07</span> 连续训练</div>
        <button className="avatar" aria-label="个人中心">YL</button>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow"><span>DAILY / 014</span> · AI ENGINEERING COACH</p>
          <h1>别急着改。<br />先证明你<span>看懂了。</span></h1>
        </div>
        <div className="today-meta">
          <span>今天 · 预计 35 分钟</span>
          <strong>订单状态“成功”<br />但数据没有更新</strong>
          <div className="tags"><i>DEBUG LAB</i><i>ACCEPTANCE TESTING</i></div>
        </div>
      </section>

      <section className="stagebar" aria-label="训练进度">
        {[["01","判断"],["02","修复"],["03","验收"],["04","复盘"]].map(([num,label], index) => {
          const active = phase === "diagnose" ? index === 0 : phase === "work" ? index === 1 || index === 2 : index === 3;
          const done = phase === "result" || (phase === "work" && index === 0);
          return <div className={active ? "stage active" : done ? "stage done" : "stage"} key={num}><span>{done ? "✓" : num}</span><b>{label}</b></div>;
        })}
      </section>

      {phase === "result" ? (
        <ResultView onRestart={() => { setPhase("diagnose"); setDiagnosis(""); setCode(initialCode); setHintLevel(0); setPanel("code"); }} />
      ) : (
        <section className="workspace">
          <aside className="brief">
            <div className="aside-heading"><span>任务简报</span><small>INCIDENT #042</small></div>
            <h2>确认订单接口返回成功，刷新后状态仍是 PENDING</h2>
            <p>客服发现部分订单在“确认”后仍可被再次修改。前端显示成功，数据库偶发未同步。请定位风险、提交最小修复，并给出验收证据。</p>

            <div className="facts">
              <h3>已知事实</h3>
              <p><span>API</span><code>POST /orders/:id/confirm</code></p>
              <p><span>响应</span><code>200 OK</code></p>
              <p><span>频率</span><code>约 1 / 20</code></p>
              <p><span>影响</span><code>状态与权限风险</code></p>
            </div>

            <div className="criteria">
              <h3>验收条件</h3>
              <label><input type="checkbox" readOnly /> 订单状态持久化</label>
              <label><input type="checkbox" readOnly /> 越权请求被拒绝</label>
              <label><input type="checkbox" readOnly /> 重复确认行为明确</label>
              <label><input type="checkbox" readOnly /> 原流程无回归</label>
            </div>
          </aside>

          <div className="lab">
            {phase === "diagnose" ? (
              <div className="diagnose-card">
                <div className="coach-label"><span>AI COACH</span><i>HUMAN FIRST</i></div>
                <blockquote>“在看提示之前，先说出你的第一判断。”</blockquote>
                <p>你认为最可能的根因是什么？你会先检查哪里？什么证据能推翻你的判断？</p>
                <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="我的判断是……\n我会先检查……\n如果看到……，说明这个判断可能是错的。" aria-label="输入你的初步诊断" />
                <div className="diagnose-footer">
                  <span>{diagnosis.trim().length} 字 · 提交后解锁代码与日志</span>
                  <button className="primary" onClick={startWork}>提交判断 <b>→</b></button>
                </div>
                {notice && <p className="notice">{notice}</p>}
              </div>
            ) : (
              <>
                <div className="lab-top">
                  <div className="tabs" role="tablist">
                    <button onClick={() => setPanel("code")} className={panel === "code" ? "selected" : ""}>代码 <span>1</span></button>
                    <button onClick={() => setPanel("logs")} className={panel === "logs" ? "selected" : ""}>日志 <span>3</span></button>
                    <button onClick={() => setPanel("tests")} className={panel === "tests" ? "selected" : ""}>验收测试 <span>4</span></button>
                  </div>
                  <span className="branch">● sandbox / order-confirm</span>
                </div>

                {panel === "code" && <div className="code-wrap"><div className="filebar"><span>api / routes /</span> orders.py <b>{codeLines} LINES</b></div><textarea className="editor" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} aria-label="代码编辑器" /></div>}
                {panel === "logs" && <Logs />}
                {panel === "tests" && <Tests running={running} />}

                <div className="coach-dock">
                  <div>
                    <span className="coach-dot">AI</span>
                    <p><b>Coach 观察</b>{hintLevel === 0 ? "你已经发现了“成功响应”和“真实状态”可能不一致。先建立一条端到端证据链。" : hintLevel === 1 ? "一级提示：除了 commit，本任务还涉及对象归属和状态转换。哪些分支目前完全没有被检查？" : "二级提示：检查 order 是否存在、owner_id 是否匹配，以及 PENDING → CONFIRMED 是否是唯一合法转换。"}</p>
                  </div>
                  <button onClick={requestHint} disabled={hintLevel >= 2}>提示 {hintLevel}/2</button>
                </div>

                {notice && <p className="inline-notice">{notice}</p>}
                <div className="actions">
                  <button className="ghost" onClick={applyPatch}>应用最小修复</button>
                  <button className="primary run" onClick={runTests} disabled={running}>{running ? "正在运行 4 项测试…" : "运行验收测试"} <b>▶</b></button>
                </div>
              </>
            )}
          </div>

          <aside className="skill-side">
            <div className="aside-heading"><span>本次训练</span><small>INTERMEDIATE</small></div>
            <div className="score-ring"><strong>68</strong><span>当前工程分</span></div>
            <div className="skill-list">
              {skills.slice(0,4).map(([name,value]) => <div key={name}><p><span>{name}</span><b>{value}</b></p><i><em style={{width:`${value}%`}} /></i></div>)}
            </div>
            <div className="rule"><span>教练规则</span><p>你不先判断，AI 不给答案。</p><p>你不运行测试，任务不算完成。</p></div>
          </aside>
        </section>
      )}

      <footer><span>FORGE / AI NATIVE ENGINEER TRAINING</span><p>Don’t trust AI. Verify AI.</p><span>SESSION 07 · 2026</span></footer>
    </main>
  );
}

function Logs() {
  return <div className="terminal"><div>$ tail -f api.log</div><p><b>10:42:11</b> POST /orders/7f2a/confirm <span>200 48ms</span></p><p><b>10:42:11</b> transaction committed <span>session=8a21</span></p><p className="warn"><b>10:42:13</b> GET /orders/7f2a <span>status=PENDING</span></p><p><b>10:42:14</b> user_id=usr_018 owner_id=usr_004</p><div className="cursor">_</div></div>;
}

function Tests({running}:{running:boolean}) {
  const tests = ["状态写入并可重新读取", "非订单所有者不可确认", "已确认订单不可重复确认", "原有订单查询无回归"];
  return <div className="test-panel"><div className="test-summary"><span>{running ? "RUNNING" : "READY"}</span><p>acceptance / order_confirm.spec.ts</p></div>{tests.map((test,i)=><div className="test-row" key={test}><span className={running && i < 3 ? "spinner" : "test-idle"}>{running ? (i < 3 ? "◌" : "○") : "○"}</span><p>{test}</p><code>CASE 0{i+1}</code></div>)}</div>;
}

function ResultView({onRestart}:{onRestart:()=>void}) {
  return <section className="result-view">
    <div className="result-hero"><p>ACCEPTANCE COMPLETE</p><h2>4 / 4 <span>通过</span></h2><div className="evidence"><i>✓ 数据持久化</i><i>✓ 权限隔离</i><i>✓ 状态机约束</i><i>✓ 无回归</i></div></div>
    <div className="review-card"><span className="review-tag">AI 复盘</span><h3>你修好的不只是一个 <code>commit()</code>。</h3><p>你的初始判断聚焦于持久化，但在验收阶段补齐了两项更关键的业务不变量：<b>“只有所有者能确认”</b>与<b>“订单只能从 PENDING 转为 CONFIRMED”</b>。这说明你开始从修 Bug 转向拥有结果。</p><div className="reflection"><span>下次再快一步</span><p>写代码前，先把验收条件转换成“必须始终成立”的业务不变量。</p></div></div>
    <div className="radar-card"><div><span>SKILL MATRIX · UPDATED</span><h3>能力雷达已更新</h3></div>{skills.map(([name,value,gain])=><div className="gain" key={name}><span>{name}</span><i><em style={{width:`${value+gain}%`}} /></i><b>+{gain}</b></div>)}<button className="primary" onClick={onRestart}>查看明日任务 <b>→</b></button></div>
  </section>;
}
