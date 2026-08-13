"use client";

import { useEffect, useMemo, useState } from "react";
import { baseSkills, tasks, type Task } from "./data";

type View = "dashboard"|"train"|"matrix"|"journal";
type Phase = "diagnose"|"work"|"evidence"|"result";
type Panel = "context"|"logs"|"tests";
type Session = { id:number; task_id:string; task_title:string; diagnosis:string; evidence:string; hints_used:number; score:number; skill_gains_json:string; completed_at:string };

export default function Home() {
  const [view,setView]=useState<View>("dashboard");
  const [task,setTask]=useState<Task>(tasks[0]);
  const [phase,setPhase]=useState<Phase>("diagnose");
  const [panel,setPanel]=useState<Panel>("context");
  const [diagnosis,setDiagnosis]=useState("");
  const [evidence,setEvidence]=useState("");
  const [workspace,setWorkspace]=useState(task.context);
  const [hints,setHints]=useState(0);
  const [running,setRunning]=useState(false);
  const [notice,setNotice]=useState("");
  const [skills,setSkills]=useState<Record<string,number>>(baseSkills);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [xp,setXp]=useState(680);
  const [streak,setStreak]=useState(7);
  const [saved,setSaved]=useState<"idle"|"saving"|"saved"|"local">("idle");

  useEffect(()=>{ void loadProgress(); },[]);
  async function loadProgress(){
    try { const res=await fetch("/api/progress"); if(!res.ok) return; const data=await res.json(); if(data.profile){setXp(Number(data.profile.xp));setStreak(Number(data.profile.streak));setSkills(JSON.parse(data.profile.skills_json));} setSessions(data.sessions??[]); } catch { /* offline preview uses defaults */ }
  }

  const completedIds=useMemo(()=>new Set(sessions.map(s=>s.task_id)),[sessions]);
  const score=Math.round(Object.values(skills).reduce((a,b)=>a+b,0)/Object.keys(skills).length);
  const rank=xp>=1200?"L4 复杂问题":xp>=800?"L3 独立交付":"L2 AI 协作";

  function openTask(next:Task){setTask(next);setPhase("diagnose");setPanel("context");setDiagnosis("");setEvidence("");setWorkspace(next.context);setHints(0);setNotice("");setView("train");window.scrollTo({top:0,behavior:"smooth"});}
  function submitDiagnosis(){if(diagnosis.trim().length<24){setNotice("判断还不够具体：请写出根因假设、第一检查点和反证条件。");return;}setNotice("");setPhase("work");}
  function applySolution(){setWorkspace(task.solution);setNotice("训练草案已放入工作区。请阅读、调整，然后用测试与证据验收。");}
  function runTests(){setRunning(true);setPanel("tests");setNotice("");window.setTimeout(()=>{setRunning(false);setPhase("evidence");},1100);}
  async function complete(){
    if(evidence.trim().length<28){setNotice("验收不能只写“通过”。请写明运行了什么、观察到什么，以及它证明了什么。");return;}
    const taskScore=Math.max(40,100-hints*12); setSaved("saving");
    setSkills(prev=>{const next={...prev};Object.entries(task.gains).forEach(([k,v])=>next[k]=Math.min(100,(next[k]??40)+v));return next;});
    setXp(v=>v+taskScore);setPhase("result");
    try{const res=await fetch("/api/progress",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({taskId:task.id,taskTitle:task.title,diagnosis,evidence,hintsUsed:hints,score:taskScore,skillGains:task.gains})});if(!res.ok)throw new Error();setSaved("saved");await loadProgress();}catch{setSaved("local");}
  }

  return <main className="app-shell">
    <Header view={view} setView={setView} streak={streak} rank={rank}/>
    {view==="dashboard"&&<Dashboard skills={skills} score={score} completed={completedIds} openTask={openTask} sessions={sessions}/>}
    {view==="train"&&<Training task={task} phase={phase} panel={panel} setPanel={setPanel} diagnosis={diagnosis} setDiagnosis={setDiagnosis} evidence={evidence} setEvidence={setEvidence} workspace={workspace} setWorkspace={setWorkspace} hints={hints} setHints={setHints} notice={notice} running={running} skills={skills} score={score} submitDiagnosis={submitDiagnosis} applySolution={applySolution} runTests={runTests} complete={complete} openTask={openTask} saved={saved}/>}
    {view==="matrix"&&<SkillMatrix skills={skills} sessions={sessions} score={score} rank={rank}/>}
    {view==="journal"&&<Journal sessions={sessions} openTask={openTask}/>}
    <footer><span>FORGE / AI NATIVE ENGINEER TRAINING</span><p>Think first. Ship with evidence.</p><span>{xp} XP · {sessions.length} SHIPPED</span></footer>
  </main>;
}

function Header({view,setView,streak,rank}:{view:View;setView:(v:View)=>void;streak:number;rank:string}){
  const items:[[View,string],...Array<[View,string]>]=[["dashboard","训练中心"],["train","当前任务"],["matrix","能力矩阵"],["journal","工程日志"]];
  return <header className="topbar"><button className="brand" onClick={()=>setView("dashboard")}><span>F</span>FORGE</button><nav aria-label="主导航">{items.map(([id,label])=><button key={id} className={view===id?"nav-active":""} onClick={()=>setView(id)}>{label}</button>)}</nav><div className="user-state"><span><b>{String(streak).padStart(2,"0")}</b> DAY STREAK</span><i>{rank}</i></div><button className="avatar" onClick={()=>setView("matrix")} aria-label="查看能力档案">AI</button></header>
}

function Dashboard({skills,score,completed,openTask,sessions}:{skills:Record<string,number>;score:number;completed:Set<string>;openTask:(t:Task)=>void;sessions:Session[]}){
  return <>
    <section className="dash-hero"><div><p className="kicker">AI ENGINEERING COACH / WORKBENCH</p><h1>今天不学一节课。<br/><span>交付一个结果。</span></h1><p>真实工程任务，有限 AI 提示，自动验收，证据复盘。你的能力由做过什么来证明。</p><button className="primary big" onClick={()=>openTask(tasks.find(t=>!completed.has(t.id))??tasks[0])}>开始今日任务 <b>→</b></button></div><div className="hero-meter"><div className="meter-score"><strong>{score}</strong><span>ENGINEERING SCORE</span></div><div className="meter-stats"><p><b>{sessions.length}</b><span>已交付任务</span></p><p><b>{Object.values(skills).filter(v=>v>=70).length}</b><span>优势能力</span></p><p><b>{Math.min(...Object.values(skills))}</b><span>最低能力</span></p></div></div></section>
    <section className="loop-strip" aria-label="学习闭环">{["真实任务","先做判断","有限提示","动手修改","自动验收","AI 复盘","更新能力"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span>{x}{i<6&&<b>→</b>}</div>)}</section>
    <section className="dashboard-grid"><div className="task-section"><div className="section-head"><div><p>NEXT MISSIONS</p><h2>工程任务队列</h2></div><span>{completed.size} / {tasks.length} COMPLETE</span></div><div className="task-grid">{tasks.map((t,i)=><button className={`task-card ${i===0?"featured":""}`} key={t.id} onClick={()=>openTask(t)}><div className="card-top"><span>{t.day}</span><i className={`difficulty d-${t.difficulty}`}>{t.difficulty}</i></div><em>{t.type}</em><h3>{t.title}</h3><p>{t.summary}</p><div className="skill-chips">{t.skills.map(s=><span key={s}>{s}</span>)}</div><div className="card-foot"><span>{t.duration} MIN</span><b>{completed.has(t.id)?"✓ 已完成":"开始 →"}</b></div></button>)}</div></div><aside className="coach-brief"><span className="ai-badge">AI COACH</span><h3>本周教练观察</h3><p>你在业务分析上已经能独立完成，但系统设计仍偏向“先选技术”。下一组任务会迫使你先定义成功指标和失败恢复。</p><blockquote>不要问 AI “怎么做”。先告诉它你如何判断。</blockquote><div className="mini-skills">{Object.entries(skills).sort((a,b)=>a[1]-b[1]).slice(0,4).map(([k,v])=><div key={k}><span>{k}</span><i><em style={{width:`${v}%`}}/></i><b>{v}</b></div>)}</div></aside></section>
  </>;
}

type TrainingProps={task:Task;phase:Phase;panel:Panel;setPanel:(p:Panel)=>void;diagnosis:string;setDiagnosis:(v:string)=>void;evidence:string;setEvidence:(v:string)=>void;workspace:string;setWorkspace:(v:string)=>void;hints:number;setHints:(v:number)=>void;notice:string;running:boolean;skills:Record<string,number>;score:number;submitDiagnosis:()=>void;applySolution:()=>void;runTests:()=>void;complete:()=>void;openTask:(t:Task)=>void;saved:string};
function Training(p:TrainingProps){const {task,phase,panel}=p;const stages=["判断","修改","验收","复盘"];return <>
  <section className="mission-head"><div><p><span>{task.day}</span> · {task.type}</p><h1>{task.title}</h1><div>{task.skills.map(s=><i key={s}>{s}</i>)}</div></div><aside><span>预计 {task.duration} 分钟</span><b>{task.difficulty}</b><button onClick={()=>p.openTask(tasks[(tasks.indexOf(task)+1)%tasks.length])}>换一个任务</button></aside></section>
  <section className="stagebar">{stages.map((s,i)=>{const at=phase==="diagnose"?0:phase==="work"?1:phase==="evidence"?2:3;return <div className={i===at?"active":i<at?"done":""} key={s}><span>{i<at?"✓":`0${i+1}`}</span><b>{s}</b></div>})}</section>
  {phase==="result"?<Result task={task} hints={p.hints} saved={p.saved} openTask={p.openTask}/>:<section className="workspace"><aside className="brief"><Label title="任务简报" meta={task.id.toUpperCase()}/><h2>{task.title}</h2><p>{task.summary}</p><InfoBlock title="已知事实" rows={task.facts}/><div className="criteria"><h3>验收条件</h3>{task.criteria.map(x=><label key={x}><input type="checkbox" readOnly checked={phase==="evidence"}/>{x}</label>)}</div></aside><div className="lab">
    {phase==="diagnose"?<Diagnose task={task} value={p.diagnosis} setValue={p.setDiagnosis} submit={p.submitDiagnosis} notice={p.notice}/>:<><div className="lab-top"><div className="tabs" role="tablist">{([["context","工作区"],["logs","运行日志"],["tests","验收测试"]] as [Panel,string][]).map(([id,label])=><button key={id} role="tab" aria-selected={panel===id} className={panel===id?"selected":""} onClick={()=>p.setPanel(id)}>{label}</button>)}</div><span>● sandbox / {task.id}</span></div>{panel==="context"&&<div className="code-wrap"><div className="filebar">{task.contextTitle}<b>{p.workspace.split("\n").length} LINES</b></div><textarea className="editor" value={p.workspace} onChange={e=>p.setWorkspace(e.target.value)} spellCheck={false} aria-label="工程工作区"/></div>}{panel==="logs"&&<div className="terminal"><div>$ forge inspect --trace</div>{task.logs.map((x,i)=><p className={i===task.logs.length-1?"warn":""} key={x}><b>{String(i+1).padStart(2,"0")}</b>{x}</p>)}<i>_</i></div>}{panel==="tests"&&<TestPanel task={task} running={p.running} passed={phase==="evidence"}/>}<CoachDock task={task} hints={p.hints} setHints={p.setHints}/>{p.notice&&<p className="inline-notice">{p.notice}</p>}{phase==="work"?<div className="actions"><button className="ghost" onClick={p.applySolution}>{task.patchLabel}</button><button className="primary" onClick={p.runTests} disabled={p.running}>{p.running?"正在执行验收…":"运行验收测试"}<b>▶</b></button></div>:<Evidence task={task} evidence={p.evidence} setEvidence={p.setEvidence} complete={p.complete} notice={p.notice}/>}</>}
  </div><aside className="skill-side"><Label title="本次训练" meta={task.difficulty}/><div className="score-ring" style={{background:`conic-gradient(var(--orange) 0 ${p.score}%,#d6d2c7 ${p.score}%)`}}><strong>{p.score}</strong><span>工程分</span></div>{task.skills.map(s=><div className="side-skill" key={s}><p><span>{s}</span><b>{p.skills[s]}</b></p><i><em style={{width:`${p.skills[s]}%`}}/></i></div>)}<div className="rule"><span>教练规则</span><p>不先判断，AI 不给答案。</p><p>不提供证据，任务不算完成。</p></div></aside></section>}
  </>}

function Diagnose({task,value,setValue,submit,notice}:{task:Task;value:string;setValue:(v:string)=>void;submit:()=>void;notice:string}){return <div className="diagnose-card"><div className="coach-label"><span>AI COACH</span><i>HUMAN FIRST</i></div><blockquote>“先留下你的判断，再打开工具。”</blockquote><p>{task.prompt}</p><textarea value={value} onChange={e=>setValue(e.target.value)} placeholder={'我的根因假设是……\n我会先检查……\n如果看到……，这个判断就不成立。'} aria-label="初步判断"/><div className="diagnose-footer"><span>{value.trim().length} 字 · 至少 24 字</span><button className="primary" onClick={submit}>锁定判断 <b>→</b></button></div>{notice&&<p className="notice">{notice}</p>}</div>}
function CoachDock({task,hints,setHints}:{task:Task;hints:number;setHints:(v:number)=>void}){return <div className="coach-dock"><span className="coach-dot">AI</span><p><b>{hints===0?"Coach 追问":`第 ${hints} 级提示`}</b>{hints===0?"先把现象、假设和证据分开。你目前知道的是事实，还是推测？":task.hints[hints-1]}</p><button onClick={()=>setHints(Math.min(2,hints+1))} disabled={hints>=2}>提示 {hints}/2</button></div>}
function TestPanel({task,running,passed}:{task:Task;running:boolean;passed:boolean}){return <div className="test-panel"><div className="test-summary"><span>{running?"RUNNING":passed?"4 / 4 PASSED":"READY"}</span><p>acceptance / {task.id}.spec</p></div>{task.criteria.map((x,i)=><div className="test-row" key={x}><span className={running?"spinner":passed?"test-pass":"test-idle"}>{running?"◌":passed?"✓":"○"}</span><p>{x}</p><code>CASE 0{i+1}</code></div>)}</div>}
function Evidence({task,evidence,setEvidence,complete,notice}:{task:Task;evidence:string;setEvidence:(v:string)=>void;complete:()=>void;notice:string}){return <div className="evidence-entry"><div><span>EVIDENCE FIRST</span><b>测试通过不等于你理解了为什么。</b></div><textarea value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder={task.evidencePlaceholder}/><button className="primary" onClick={complete}>提交证据并复盘 <b>→</b></button>{notice&&<p className="notice">{notice}</p>}</div>}
function Result({task,hints,saved,openTask}:{task:Task;hints:number;saved:string;openTask:(t:Task)=>void}){const next=tasks[(tasks.indexOf(task)+1)%tasks.length];return <section className="result-view"><div className="result-hero"><p>ACCEPTANCE COMPLETE</p><h2>4 / 4 <span>通过</span></h2><div>{task.criteria.map(x=><i key={x}>✓ {x}</i>)}</div></div><div className="review-card"><span>AI 复盘</span><h3>你交付的是<span>证据链</span>，不只是答案。</h3><p>你完成了“假设 → 修改 → 运行 → 观察 → 证明”的完整闭环。{hints===0?"本次没有使用提示，独立判断表现突出。":`本次使用 ${hints} 级提示；下一次尝试在请求提示前多写一个可证伪假设。`}</p><blockquote>下一次：把每条验收条件都改写成一个可观察、可重复的测试。</blockquote><small>{saved==="saved"?"✓ 训练记录已保存":saved==="saving"?"正在保存训练记录…":"当前环境未连接数据库，本次结果已在页面保留"}</small></div><div className="result-skills"><p>SKILL MATRIX · UPDATED</p><h3>能力增量</h3>{Object.entries(task.gains).map(([k,v])=><div key={k}><span>{k}</span><i>+{v}</i></div>)}<button className="primary" onClick={()=>openTask(next)}>继续下一任务 <b>→</b></button></div></section>}

function SkillMatrix({skills,sessions,score,rank}:{skills:Record<string,number>;sessions:Session[];score:number;rank:string}){const sorted=Object.entries(skills).sort((a,b)=>b[1]-a[1]);return <section className="profile-page"><div className="profile-head"><p>COMPETENCY MODEL / EVIDENCE BASED</p><h1>能力不是自评，<br/><span>是交付记录。</span></h1><div><strong>{score}</strong><span>综合工程分<br/><b>{rank}</b></span></div></div><div className="matrix-grid"><div className="matrix-list"><div className="section-head"><div><p>SKILL MATRIX</p><h2>八维能力矩阵</h2></div><span>{sessions.length} 个证据样本</span></div>{sorted.map(([name,value],i)=><div className="matrix-row" key={name}><span>0{i+1}</span><b>{name}</b><i><em style={{width:`${value}%`}}/></i><strong>{value}</strong><small>{value>=80?"L4":value>=65?"L3":value>=50?"L2":"L1"}</small></div>)}</div><aside className="growth-plan"><span>ADAPTIVE PLAN</span><h3>下一阶段重点</h3><p>系统根据能力低点和最近训练证据生成，而不是固定课程表。</p>{sorted.slice(-3).reverse().map(([name,value],i)=><div key={name}><b>0{i+1}</b><p><strong>{name}</strong><span>当前 {value} · 建议完成 2 个专项任务</span></p></div>)}<blockquote>目标：从“在 AI 帮助下完成”到“能独立判断并验收”。</blockquote></aside></div></section>}
function Journal({sessions,openTask}:{sessions:Session[];openTask:(t:Task)=>void}){return <section className="journal-page"><div className="section-head large"><div><p>ENGINEERING JOURNAL</p><h1>每一次判断，<br/>都成为下一次的经验。</h1></div><span>{sessions.length} RECORDS</span></div>{sessions.length===0?<div className="empty-journal"><span>00</span><h2>还没有已保存的训练记录</h2><p>完成第一个任务后，这里会保存你的初始判断、证据、提示使用和能力增量。</p><button className="primary" onClick={()=>openTask(tasks[0])}>开始第一次训练 <b>→</b></button></div>:<div className="journal-list">{sessions.map((s,i)=><article key={s.id}><div><span>{String(sessions.length-i).padStart(2,"0")}</span><time>{new Date(s.completed_at).toLocaleDateString("zh-CN")}</time></div><main><p>{tasks.find(t=>t.id===s.task_id)?.type??"ENGINEERING TASK"}</p><h2>{s.task_title}</h2><section><div><b>第一判断</b><p>{s.diagnosis}</p></div><div><b>验收证据</b><p>{s.evidence}</p></div></section></main><aside><strong>{s.score}</strong><span>XP</span><p>提示 {s.hints_used}/2</p></aside></article>)}</div>}</section>}
function Label({title,meta}:{title:string;meta:string}){return <div className="aside-heading"><span>{title}</span><small>{meta}</small></div>}
function InfoBlock({title,rows}:{title:string;rows:[string,string][]}){return <div className="facts"><h3>{title}</h3>{rows.map(([k,v])=><p key={k}><span>{k}</span><code>{v}</code></p>)}</div>}
