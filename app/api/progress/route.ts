import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "../../../db";
import { profiles, skillEvents, taskAttempts, taskCatalog, trainingSessions } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { baseSkills, selectDailyTasks, tasks, type Task } from "../../data";

export const runtime = "nodejs";
const ANONYMOUS_COOKIE = "forge-user-id";

type RequestIdentity={userId:string;displayName:string;setCookie:boolean};
type Diagnosis={phenomenon?:string;facts?:string;hypothesis?:string;firstCheckpoint?:string;supportingEvidence?:string;counterEvidence?:string;nextExperiment?:string};
type Evidence={action?:string;actual?:string;dataState?:string;reason?:string};
type Reflection={initialJudgment?:string;actualRootCause?:string;wrongAssumption?:string;keyEvidence?:string;helpfulHint?:string;nextFirstStep?:string;designRationale?:string;alternative?:string;largestRisk?:string;refactorTrigger?:string};
type ReviewDecision={decision?:"accept"|"reject"|"changes";riskLevel?:"P0"|"P1"|"P2"|"P3";issues?:string;rationale?:string;revisionRequest?:string;architectureDriftDetected?:boolean;trustBefore?:number;trustAfter?:number};

async function identity():Promise<RequestIdentity>{
  const signedInUser=await getChatGPTUser();
  if(signedInUser)return{userId:signedInUser.userId,displayName:signedInUser.displayName,setCookie:false};
  const cookieStore=await cookies();
  const existingId=cookieStore.get(ANONYMOUS_COOKIE)?.value;
  return{userId:existingId??crypto.randomUUID(),displayName:"AI 工程师",setCookie:!existingId};
}

function response(body:unknown,user:RequestIdentity,status=200){
  const result=NextResponse.json(body,{status});
  if(user.setCookie)result.cookies.set(ANONYMOUS_COOKIE,user.userId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:60*60*24*365,path:"/"});
  return result;
}

function parseJson<T>(value:string,fallback:T):T{try{return JSON.parse(value) as T}catch{return fallback}}
function normalizeSkills(saved:Record<string,number>){return Object.fromEntries(Object.entries(baseSkills).map(([name,value])=>[name,Math.max(0,Math.min(100,saved[name]??value))]))}
function profilePayload(profile:typeof profiles.$inferSelect){return{user_id:profile.userId,display_name:profile.displayName,xp:profile.xp,streak:profile.streak,skills_json:profile.skillsJson,updated_at:profile.updatedAt.toISOString()}}
function attemptPayload(attempt:typeof taskAttempts.$inferSelect){return{id:attempt.id,user_id:attempt.userId,task_id:attempt.taskId,variant_id:attempt.variantId,task_title:attempt.taskTitle,diagnosis:attempt.diagnosisJson,evidence:attempt.evidenceJson,reflection:attempt.reflectionJson,review:attempt.reviewJson,specification:attempt.specificationJson,release_readiness:attempt.releaseReadinessJson,test_results:attempt.testResultsJson,tool_usage:attempt.toolUsageJson,hints_used:attempt.hintsUsed,first_hint_seconds:attempt.firstHintSeconds,autonomous_diagnosis:attempt.autonomousDiagnosis,independent_completion:attempt.independentCompletion,ai_dependency_score:attempt.aiDependencyScore,ai_judgment_score:attempt.aiJudgmentScore,engineering_ownership_score:attempt.engineeringOwnershipScore,ai_claim_confidence:attempt.aiClaimConfidence,ai_claim_accurate:attempt.aiClaimAccurate,architecture_drift_detected:attempt.architectureDriftDetected,score:attempt.score,skill_gains_json:attempt.skillGainsJson,duration_seconds:attempt.durationSeconds,completed_at:attempt.completedAt.toISOString()}}
function legacyPayload(session:typeof trainingSessions.$inferSelect){return{id:-session.id,user_id:session.userId,task_id:session.taskId,variant_id:`legacy:${session.taskId}`,task_title:session.taskTitle,diagnosis:session.diagnosis,evidence:session.evidence,reflection:"{}",review:"{}",specification:"[]",release_readiness:"[]",test_results:"[]",tool_usage:"[]",hints_used:session.hintsUsed,first_hint_seconds:0,autonomous_diagnosis:session.hintsUsed===0,independent_completion:true,ai_dependency_score:session.hintsUsed*25,ai_judgment_score:0,engineering_ownership_score:0,ai_claim_confidence:0,ai_claim_accurate:false,architecture_drift_detected:false,score:session.score,skill_gains_json:session.skillGainsJson,duration_seconds:0,completed_at:session.completedAt.toISOString()}}
function validDiagnosis(value:Diagnosis){return(value.phenomenon?.trim().length??0)>=6&&(value.hypothesis?.trim().length??0)>=8&&(value.firstCheckpoint?.trim().length??0)>=6&&(value.counterEvidence?.trim().length??0)>=6}
function validEvidence(value:Evidence){return(value.action?.trim().length??0)>=4&&(value.actual?.trim().length??0)>=4&&(value.reason?.trim().length??0)>=8}

export async function GET(){
  const user=await identity();
  try{
    const db=getDb();
    let [profile]=await db.select().from(profiles).where(eq(profiles.userId,user.userId)).limit(1);
    if(!profile){const now=new Date();[profile]=await db.insert(profiles).values({userId:user.userId,displayName:user.displayName,xp:680,streak:7,skillsJson:JSON.stringify(baseSkills),updatedAt:now}).onConflictDoUpdate({target:profiles.userId,set:{displayName:user.displayName,updatedAt:now}}).returning()}
    const [attempts,legacy,customRows]=await Promise.all([
      db.select().from(taskAttempts).where(eq(taskAttempts.userId,user.userId)).orderBy(desc(taskAttempts.completedAt)).limit(60),
      db.select().from(trainingSessions).where(eq(trainingSessions.userId,user.userId)).orderBy(desc(trainingSessions.completedAt)).limit(30),
      db.select().from(taskCatalog).where(eq(taskCatalog.published,true)).orderBy(desc(taskCatalog.updatedAt)).limit(50),
    ]);
    const skills=normalizeSkills(parseJson(profile.skillsJson,{...baseSkills}));
    profile={...profile,skillsJson:JSON.stringify(skills)};
    const customTasks=customRows.map(row=>parseJson<Task|null>(row.taskJson,null)).filter((task):task is Task=>Boolean(task));
    const recentIds=attempts.filter(a=>Date.now()-a.completedAt.getTime()<30*86400000).map(a=>a.variantId);
    const daily=selectDailyTasks(recentIds,skills,new Date(),3);
    if(customTasks.length&&daily.length)daily[daily.length-1]={...customTasks[0],variantId:`custom:${customTasks[0].id}`,recommendationReason:"来自管理员发布的真实业务任务"};
    const sessions=[...attempts.map(attemptPayload),...legacy.map(legacyPayload)].sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at)).slice(0,60);
    return response({profile:profilePayload(profile),sessions,dailyTasks:daily,catalogSize:tasks.length+customTasks.length,variantCapacity:(tasks.length+customTasks.length)*5,persistence:"postgres"},user);
  }catch{
    return response({profile:{display_name:user.displayName,xp:680,streak:7,skills_json:JSON.stringify(baseSkills)},sessions:[],dailyTasks:selectDailyTasks([],baseSkills),catalogSize:tasks.length,variantCapacity:tasks.length*5,persistence:"unavailable"},user);
  }
}

export async function POST(request:Request){
  const user=await identity();
  try{
    const body=await request.json() as {taskId?:string;variantId?:string;taskTitle?:string;diagnosis?:Diagnosis;evidence?:Evidence;reflection?:Reflection;reviewDecision?:ReviewDecision;specificationCoverage?:string[];releaseChecks?:string[];testResults?:unknown[];toolUsage?:string[];hintsUsed?:number;firstHintSeconds?:number;autonomousDiagnosis?:boolean;durationSeconds?:number};
    const diagnosis=body.diagnosis??{};const evidence=body.evidence??{};const reflection=body.reflection??{};
    let task=tasks.find(candidate=>candidate.id===body.taskId);
    if(!task&&body.taskId){const [custom]=await getDb().select().from(taskCatalog).where(eq(taskCatalog.id,body.taskId)).limit(1);task=custom?parseJson<Task|null>(custom.taskJson,null)??undefined:undefined}
    const review=body.reviewDecision??{};const specificationCoverage=Array.isArray(body.specificationCoverage)?body.specificationCoverage:[];const releaseChecks=Array.isArray(body.releaseChecks)?body.releaseChecks:[];
    if(!task||!body.variantId||!validDiagnosis(diagnosis)||!validEvidence(evidence)||!Array.isArray(body.testResults)||body.testResults.length!==4||!review.decision||(review.issues?.trim().length??0)<8||(review.rationale?.trim().length??0)<8)return response({error:"invalid judgment or training evidence"},user,400);
    const db=getDb();const hintsUsed=Math.max(0,Math.min(3,Number(body.hintsUsed)||0));const firstHintSeconds=Math.max(0,Math.min(7200,Number(body.firstHintSeconds)||0));
    const autonomousDiagnosis=body.autonomousDiagnosis!==false;const independentCompletion=hintsUsed<3;
    const aiDependencyScore=Math.min(100,hintsUsed*22+(firstHintSeconds>0&&firstHintSeconds<120?18:0)+(autonomousDiagnosis?0:14));
    const issueCount=Math.max(1,(review.issues??"").split(/\n|；|;/).filter(Boolean).length);const correctDecision=task.aiSubmission?.safe?review.decision==="accept":review.decision!=="accept";
    const aiJudgmentScore=Math.max(20,Math.min(100,35+Math.min(32,issueCount*8)+(correctDecision?25:0)+(["P0","P1"].includes(review.riskLevel??"")?8:3)-hintsUsed*4));
    const specificationScore=Math.min(100,Math.round(specificationCoverage.length/Math.max(1,task.specificationDimensions?.length??11)*100));
    const releaseScore=Math.min(100,Math.round(releaseChecks.length/Math.max(1,task.completionClaims?.length??12)*100));
    const reflectionBonus=(reflection.nextFirstStep?.trim().length??0)>=6?20:0;
    const engineeringOwnershipScore=Math.max(20,Math.min(100,Math.round(releaseScore*.55+specificationScore*.25+reflectionBonus)));
    const score=Math.max(40,Math.round((100-aiDependencyScore*.42)*.5+aiJudgmentScore*.3+engineeringOwnershipScore*.2));
    const [current]=await db.select().from(profiles).where(eq(profiles.userId,user.userId)).limit(1);
    const skills=current?normalizeSkills(parseJson(current.skillsJson,{...baseSkills})):{...baseSkills};const awardedGains:Record<string,number>={};
    for(const[name,gain]of Object.entries(task.gains)){const awarded=Math.max(1,Math.round(gain*(score/100)*.45));skills[name]=Math.min(100,(skills[name]??40)+awarded);awardedGains[name]=awarded}
    const now=new Date();const xp=(current?.xp??680)+score;
    const [attempt]=await db.insert(taskAttempts).values({userId:user.userId,taskId:task.id,variantId:body.variantId,taskTitle:body.taskTitle??task.title,diagnosisJson:JSON.stringify(diagnosis),evidenceJson:JSON.stringify(evidence),reflectionJson:JSON.stringify(reflection),reviewJson:JSON.stringify(review),specificationJson:JSON.stringify(specificationCoverage),releaseReadinessJson:JSON.stringify(releaseChecks),testResultsJson:JSON.stringify(body.testResults),toolUsageJson:JSON.stringify(body.toolUsage??[]),hintsUsed,firstHintSeconds,autonomousDiagnosis,independentCompletion,aiDependencyScore,aiJudgmentScore,engineeringOwnershipScore,aiClaimConfidence:task.aiSubmission?.confidence??0,aiClaimAccurate:Boolean(task.aiSubmission?.safe),architectureDriftDetected:Boolean(review.architectureDriftDetected),score,skillGainsJson:JSON.stringify(awardedGains),durationSeconds:Math.max(0,Number(body.durationSeconds)||0),completedAt:now}).returning();
    await db.insert(profiles).values({userId:user.userId,displayName:user.displayName,xp,streak:current?.streak??7,skillsJson:JSON.stringify(skills),updatedAt:now}).onConflictDoUpdate({target:profiles.userId,set:{displayName:user.displayName,xp,skillsJson:JSON.stringify(skills),updatedAt:now}});
    const events=Object.entries(awardedGains).map(([skill,delta])=>({userId:user.userId,attemptId:attempt.id,skill,delta,reason:`${task.type} 验收通过`,createdAt:now}));
    if(events.length)await db.insert(skillEvents).values(events);
    return response({ok:true,awarded:true,skills,xp,score,aiDependencyScore,aiJudgmentScore,engineeringOwnershipScore,specificationScore,releaseScore,attempt:attemptPayload(attempt)},user);
  }catch(error){return response({error:error instanceof Error?error.message:"save failed"},user,503)}
}
