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
type Observation={signals?:string;knownFacts?:string;unknowns?:string;sources?:string;user?:string;why?:string;what?:string;input?:string;output?:string;constraints?:string;successMetric?:string;failureCondition?:string;requirementApproval?:"approve"|"reopen"};
type SystemModel={boundary?:string;currentState?:string;expectedState?:string;transition?:string;callChain?:string;dataFlow?:string;dependencies?:string;runtimeState?:string;candidateSolutions?:string;tradeoffs?:string;risks?:string;decisionRecord?:string;solutionApproval?:"approve"|"revise"|"reject"};
type ActionPlan={candidateActions?:string;nextBestAction?:string;selectedTool?:string;informationGain?:number;expectedObservation?:string;cost?:string;risk?:string;fallback?:string;scopeGoal?:string;proposedFiles?:string;impactAnalysis?:string;excludedChanges?:string;contextBudget?:string;approvalDecision?:"approve"|"split"|"reject"};
type StateUpdate={actionResult?:string;newObservation?:string;modelChanged?:string;hypothesisStatus?:string;replannedAction?:string};
type Evidence={action?:string;actual?:string;dataState?:string;reason?:string};
type Reflection={initialJudgment?:string;actualRootCause?:string;wrongAssumption?:string;keyEvidence?:string;helpfulHint?:string;nextFirstStep?:string;designRationale?:string;alternative?:string;largestRisk?:string;refactorTrigger?:string};
type ReviewDecision={decision?:"accept"|"reject"|"changes";scopeDecision?:"accept"|"reject"|"split"|"rollback"|"smaller";riskLevel?:"P0"|"P1"|"P2"|"P3";issues?:string;rationale?:string;revisionRequest?:string;understanding?:string;rollback?:string;architectureDriftDetected?:boolean;impactApproved?:boolean;finalApproval?:boolean;reviewCapacity?:number;trustBefore?:number;trustAfter?:number;suggestionDecisions?:Record<string,string>};

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
function averageScore(values:number[]){return values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length):0}
function currentSkillName(name:string){return({"Code Reading":"Observation","Code Modification":"State Update",Debug:"Hypothesis","System Design":"Architecture Reasoning","Acceptance Testing":"Verification","Business Analysis":"System Modeling","Code Review":"AI Judgment",Delivery:"Engineering Ownership"} as Record<string,string>)[name]??name}
function normalizeSkills(saved:Record<string,number>){const aliases:Record<string,string[]>={"System Modeling":["Business Analysis"],Planning:["AI Orchestration"],Hypothesis:["Debug"],Falsification:["Debug","Acceptance Testing"],"Tool Selection":["AI Orchestration"],Observation:["Code Reading"],"State Update":["Code Modification"],"Architecture Reasoning":["System Design"],Verification:["Acceptance Testing"],"AI Judgment":["Code Review"]};return Object.fromEntries(Object.entries(baseSkills).map(([name,value])=>{const candidates=[saved[name],...(aliases[name]??[]).map(alias=>saved[alias])].filter((item):item is number=>typeof item==="number");return[name,Math.max(0,Math.min(100,candidates.length?Math.round(candidates.reduce((sum,item)=>sum+item,0)/candidates.length):value))]}))}
function profilePayload(profile:typeof profiles.$inferSelect){return{user_id:profile.userId,display_name:profile.displayName,xp:profile.xp,streak:profile.streak,skills_json:profile.skillsJson,updated_at:profile.updatedAt.toISOString()}}
function attemptPayload(attempt:typeof taskAttempts.$inferSelect){return{id:attempt.id,user_id:attempt.userId,task_id:attempt.taskId,variant_id:attempt.variantId,task_title:attempt.taskTitle,diagnosis:attempt.diagnosisJson,evidence:attempt.evidenceJson,reflection:attempt.reflectionJson,review:attempt.reviewJson,specification:attempt.specificationJson,release_readiness:attempt.releaseReadinessJson,test_results:attempt.testResultsJson,tool_usage:attempt.toolUsageJson,hints_used:attempt.hintsUsed,first_hint_seconds:attempt.firstHintSeconds,autonomous_diagnosis:attempt.autonomousDiagnosis,independent_completion:attempt.independentCompletion,ai_dependency_score:attempt.aiDependencyScore,ai_judgment_score:attempt.aiJudgmentScore,engineering_ownership_score:attempt.engineeringOwnershipScore,ai_claim_confidence:attempt.aiClaimConfidence,ai_claim_accurate:attempt.aiClaimAccurate,architecture_drift_detected:attempt.architectureDriftDetected,score:attempt.score,skill_gains_json:attempt.skillGainsJson,duration_seconds:attempt.durationSeconds,completed_at:attempt.completedAt.toISOString()}}
function legacyPayload(session:typeof trainingSessions.$inferSelect){return{id:-session.id,user_id:session.userId,task_id:session.taskId,variant_id:`legacy:${session.taskId}`,task_title:session.taskTitle,diagnosis:session.diagnosis,evidence:session.evidence,reflection:"{}",review:"{}",specification:"[]",release_readiness:"[]",test_results:"[]",tool_usage:"[]",hints_used:session.hintsUsed,first_hint_seconds:0,autonomous_diagnosis:session.hintsUsed===0,independent_completion:true,ai_dependency_score:session.hintsUsed*25,ai_judgment_score:0,engineering_ownership_score:0,ai_claim_confidence:0,ai_claim_accurate:false,architecture_drift_detected:false,score:session.score,skill_gains_json:session.skillGainsJson,duration_seconds:0,completed_at:session.completedAt.toISOString()}}
function validDiagnosis(value:Diagnosis){return(value.phenomenon?.trim().length??0)>=6&&(value.hypothesis?.trim().length??0)>=8&&(value.firstCheckpoint?.trim().length??0)>=6&&(value.counterEvidence?.trim().length??0)>=6}
function validEvidence(value:Evidence){return(value.action?.trim().length??0)>=4&&(value.actual?.trim().length??0)>=4&&(value.reason?.trim().length??0)>=8}
function validObservation(value:Observation){return(value.signals?.trim().length??0)>=6&&(value.knownFacts?.trim().length??0)>=6&&(value.unknowns?.trim().length??0)>=4&&[value.user,value.why,value.what,value.input,value.output,value.constraints,value.successMetric,value.failureCondition].every(item=>(item?.trim().length??0)>=4)&&value.requirementApproval==="approve"}
function validModel(value:SystemModel){return(value.boundary?.trim().length??0)>=6&&(value.currentState?.trim().length??0)>=6&&(value.expectedState?.trim().length??0)>=6&&(value.callChain?.trim().length??0)>=6&&[value.candidateSolutions,value.tradeoffs,value.risks,value.decisionRecord].every(item=>(item?.trim().length??0)>=6)&&value.solutionApproval==="approve"}
function validPlan(value:ActionPlan){return(value.candidateActions?.trim().length??0)>=8&&(value.nextBestAction?.trim().length??0)>=6&&(value.selectedTool?.trim().length??0)>=2&&(value.expectedObservation?.trim().length??0)>=6&&(value.scopeGoal?.trim().length??0)>=6&&(value.proposedFiles?.trim().length??0)>=4&&(value.impactAnalysis?.trim().length??0)>=8&&value.approvalDecision==="approve"}
function validStateUpdate(value:StateUpdate){return(value.actionResult?.trim().length??0)>=6&&(value.newObservation?.trim().length??0)>=6&&(value.modelChanged?.trim().length??0)>=6&&(value.hypothesisStatus?.trim().length??0)>=6}

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
    const body=await request.json() as {taskId?:string;variantId?:string;taskTitle?:string;observation?:Observation;systemModel?:SystemModel;diagnosis?:Diagnosis;actionPlan?:ActionPlan;evidence?:Evidence;stateUpdate?:StateUpdate;reflection?:Reflection;reviewDecision?:ReviewDecision;funnelHistory?:unknown[];specificationCoverage?:string[];releaseChecks?:string[];testResults?:unknown[];toolUsage?:string[];hintsUsed?:number;firstHintSeconds?:number;autonomousDiagnosis?:boolean;durationSeconds?:number};
    const observation=body.observation??{};const systemModel=body.systemModel??{};const diagnosis=body.diagnosis??{};const actionPlan=body.actionPlan??{};const evidence=body.evidence??{};const stateUpdate=body.stateUpdate??{};const reflection=body.reflection??{};
    let task=tasks.find(candidate=>candidate.id===body.taskId);
    if(!task&&body.taskId){const [custom]=await getDb().select().from(taskCatalog).where(eq(taskCatalog.id,body.taskId)).limit(1);task=custom?parseJson<Task|null>(custom.taskJson,null)??undefined:undefined}
    const review=body.reviewDecision??{};const specificationCoverage=Array.isArray(body.specificationCoverage)?body.specificationCoverage:[];const releaseChecks=Array.isArray(body.releaseChecks)?body.releaseChecks:[];
    if(!task||!body.variantId||!validObservation(observation)||!validModel(systemModel)||!validDiagnosis(diagnosis)||!validPlan(actionPlan)||!validEvidence(evidence)||!validStateUpdate(stateUpdate)||!Array.isArray(body.testResults)||body.testResults.length!==4||!review.decision||!review.scopeDecision||!review.finalApproval||(review.issues?.trim().length??0)<8||(review.rationale?.trim().length??0)<8||(review.understanding?.trim().length??0)<8||(review.rollback?.trim().length??0)<6)return response({error:"invalid four-layer funnel evidence"},user,400);
    const db=getDb();const hintsUsed=Math.max(0,Math.min(3,Number(body.hintsUsed)||0));const firstHintSeconds=Math.max(0,Math.min(7200,Number(body.firstHintSeconds)||0));
    const autonomousDiagnosis=body.autonomousDiagnosis!==false;const independentCompletion=hintsUsed<3;
    const aiDependencyScore=Math.min(100,hintsUsed*22+(firstHintSeconds>0&&firstHintSeconds<120?18:0)+(autonomousDiagnosis?0:14));
    const issueCount=Math.max(1,(review.issues??"").split(/\n|；|;/).filter(Boolean).length);const correctDecision=task.aiSubmission?.safe?review.decision==="accept":review.decision!=="accept";
    const aiJudgmentScore=Math.max(20,Math.min(100,35+Math.min(32,issueCount*8)+(correctDecision?25:0)+(["P0","P1"].includes(review.riskLevel??"")?8:3)-hintsUsed*4));
    const fieldScore=(values:(string|undefined)[])=>Math.min(100,Math.round(values.filter(value=>(value?.trim().length??0)>=6).length/Math.max(1,values.length)*100));
    const observationScore=fieldScore([observation.signals,observation.knownFacts,observation.unknowns,observation.sources]);
    const systemModelingScore=fieldScore([systemModel.boundary,systemModel.currentState,systemModel.expectedState,systemModel.transition,systemModel.callChain,systemModel.dataFlow,systemModel.dependencies,systemModel.runtimeState]);
    const hypothesisScore=fieldScore([diagnosis.hypothesis,diagnosis.supportingEvidence,diagnosis.firstCheckpoint]);
    const falsificationScore=fieldScore([diagnosis.counterEvidence,diagnosis.nextExperiment]);
    const planningScore=Math.min(100,Math.round(fieldScore([actionPlan.candidateActions,actionPlan.nextBestAction,actionPlan.expectedObservation,actionPlan.fallback])*.75+(Number(actionPlan.informationGain)||0)*.25));
    const selectedTool=String(actionPlan.selectedTool??"");const usedTools=Array.isArray(body.toolUsage)?body.toolUsage:[];
    const toolSelectionScore=Math.min(100,45+Math.min(35,usedTools.length*7)+(usedTools.includes(selectedTool)?20:0));
    const stateUpdateScore=fieldScore([stateUpdate.actionResult,stateUpdate.newObservation,stateUpdate.modelChanged,stateUpdate.hypothesisStatus,stateUpdate.replannedAction]);
    const specificationScore=Math.min(100,Math.round(specificationCoverage.length/Math.max(1,task.specificationDimensions?.length??11)*100));
    const releaseScore=Math.min(100,Math.round(releaseChecks.length/Math.max(1,task.completionClaims?.length??12)*100));
    const reflectionBonus=(reflection.nextFirstStep?.trim().length??0)>=6?20:0;
    const engineeringOwnershipScore=Math.max(20,Math.min(100,Math.round(releaseScore*.55+specificationScore*.25+reflectionBonus)));
    const verificationScore=Math.round((releaseScore+specificationScore+100)/3);
    const budget=task.changeBudget??{maxFiles:5,maxLines:320,maxModules:1,maxDependencies:0,maxMigrations:0,impactAnalysisRequired:false};const submission=task.aiSubmission;
    const filesChanged=submission?.filesChanged??submission?.changedFiles.length??0;const linesAdded=submission?.linesAdded??0;const dependencyChanges=submission?.newDependencies??0;const migrationChanges=submission?.migrations??0;const reviewCapacity=Math.max(40,Number(review.reviewCapacity)||180);
    const generationReviewRatio=Math.round(linesAdded/reviewCapacity*100)/100;
    const cognitiveDebtScore=Math.min(100,Math.round((filesChanged/Math.max(1,budget.maxFiles)+linesAdded/Math.max(1,budget.maxLines)+dependencyChanges/Math.max(1,budget.maxDependencies||1)+migrationChanges/Math.max(1,budget.maxMigrations||1))*25));
    const reviewCoverage=fieldScore([review.issues,review.rationale,review.revisionRequest,review.understanding,review.rollback]);
    const understandingCoverage=fieldScore([review.understanding,review.rollback,actionPlan.impactAnalysis,actionPlan.excludedChanges,actionPlan.contextBudget]);
    const diffReviewScore=Math.min(100,Math.round(reviewCoverage*.55+understandingCoverage*.25+(review.scopeDecision?20:0)));
    const scopeControlScore=Math.min(100,Math.round(fieldScore([actionPlan.scopeGoal,actionPlan.proposedFiles,actionPlan.impactAnalysis,actionPlan.excludedChanges])*.7+(review.scopeDecision!=="accept"?30:15)));
    const requiresSpecialApproval=dependencyChanges>0||migrationChanges>0||budget.impactAnalysisRequired;const architectureControlScore=Math.min(100,55+(review.architectureDriftDetected?20:10)+(requiresSpecialApproval&&review.impactApproved?25:requiresSpecialApproval?0:25));
    const changeRiskScore=Math.min(100,Math.round(cognitiveDebtScore*.55+(review.riskLevel==="P0"?40:review.riskLevel==="P1"?30:review.riskLevel==="P2"?20:10)+(review.architectureDriftDetected?15:0)));
    const controlledDeliveryScore=averageScore([100-cognitiveDebtScore,reviewCoverage,understandingCoverage,diffReviewScore,scopeControlScore,architectureControlScore,Math.max(0,100-Math.max(0,generationReviewRatio-1)*40)]);
    const requirementQualityScore=fieldScore([observation.user,observation.why,observation.what,observation.input,observation.output,observation.constraints,observation.successMetric,observation.failureCondition,observation.knownFacts,observation.unknowns]);
    const solutionQualityScore=fieldScore([systemModel.boundary,systemModel.currentState,systemModel.expectedState,systemModel.candidateSolutions,systemModel.tradeoffs,systemModel.risks,systemModel.decisionRecord,systemModel.callChain,systemModel.dataFlow,systemModel.dependencies]);
    const implementationPlanningScore=averageScore([planningScore,scopeControlScore,diffReviewScore,architectureControlScore]);
    const acceptanceQualityScore=averageScore([verificationScore,releaseScore,specificationScore,fieldScore([evidence.action,evidence.actual,evidence.dataState,evidence.reason,reflection.keyEvidence,reflection.nextFirstStep])]);
    const engineeringConvergenceScore=averageScore([requirementQualityScore,solutionQualityScore,implementationPlanningScore,acceptanceQualityScore]);
    const loopReasoningScore=averageScore([observationScore,systemModelingScore,hypothesisScore,falsificationScore,planningScore,toolSelectionScore,stateUpdateScore,verificationScore]);
    const score=Math.max(40,Math.round(loopReasoningScore*.24+controlledDeliveryScore*.22+engineeringConvergenceScore*.22+(100-aiDependencyScore*.42)*.1+aiJudgmentScore*.12+engineeringOwnershipScore*.1));
    const [current]=await db.select().from(profiles).where(eq(profiles.userId,user.userId)).limit(1);
    const skills=current?normalizeSkills(parseJson(current.skillsJson,{...baseSkills})):{...baseSkills};const awardedGains:Record<string,number>={};
    const evidenceScores:Record<string,number>={Observation:observationScore,"System Modeling":systemModelingScore,Hypothesis:hypothesisScore,Falsification:falsificationScore,Planning:planningScore,"Tool Selection":toolSelectionScore,"State Update":stateUpdateScore,"AI Judgment":aiJudgmentScore,"AI Orchestration":toolSelectionScore,Specification:specificationScore,"Architecture Reasoning":systemModelingScore,Verification:verificationScore,"Scope Control":scopeControlScore,"Cognitive Load Management":100-cognitiveDebtScore,"Review Capacity":Math.max(0,100-Math.max(0,generationReviewRatio-1)*40),"Context Management":fieldScore([actionPlan.contextBudget,actionPlan.excludedChanges]),"AI Output Control":scopeControlScore,"Change Impact Analysis":fieldScore([actionPlan.impactAnalysis,review.rollback]),"Diff Review":diffReviewScore,"Architecture Guardrails":architectureControlScore,"AI Pacing":Math.max(0,100-Math.max(0,generationReviewRatio-1)*40),"Engineering Ownership":engineeringOwnershipScore,"Requirement Convergence":requirementQualityScore,"Business Understanding":fieldScore([observation.user,observation.why,observation.what,observation.successMetric]),"Requirement Completeness":requirementQualityScore,"Solution Convergence":solutionQualityScore,"Technical Tradeoff":fieldScore([systemModel.candidateSolutions,systemModel.tradeoffs,systemModel.risks,systemModel.decisionRecord]),"Implementation Planning":implementationPlanningScore,"Acceptance Design":averageScore([specificationScore,releaseScore]),"Evidence Quality":acceptanceQualityScore};
    const taskGainBudget=Object.entries(task.gains).reduce<Record<string,number>>((result,[name,value])=>{const mapped=currentSkillName(name);result[mapped]=(result[mapped]??0)+value;return result},{});
    const gainBudget:Record<string,number>={...Object.fromEntries(Object.keys(baseSkills).map(name=>[name,2])),...taskGainBudget};
    for(const[name,gain]of Object.entries(gainBudget)){const awarded=Math.max(1,Math.round(gain*((evidenceScores[name]??score)/100)*.35));skills[name]=Math.min(100,(skills[name]??40)+awarded);awardedGains[name]=awarded}
    const now=new Date();const xp=(current?.xp??680)+score;
    const [attempt]=await db.insert(taskAttempts).values({userId:user.userId,taskId:task.id,variantId:body.variantId,taskTitle:body.taskTitle??task.title,diagnosisJson:JSON.stringify({observation,systemModel,hypothesis:diagnosis,actionPlan,funnelHistory:Array.isArray(body.funnelHistory)?body.funnelHistory:[],scores:{observationScore,systemModelingScore,hypothesisScore,falsificationScore,planningScore,toolSelectionScore,requirementQualityScore,solutionQualityScore,implementationPlanningScore,acceptanceQualityScore,engineeringConvergenceScore}}),evidenceJson:JSON.stringify({verification:evidence,stateUpdate,verificationScore}),reflectionJson:JSON.stringify(reflection),reviewJson:JSON.stringify(review),specificationJson:JSON.stringify(specificationCoverage),releaseReadinessJson:JSON.stringify(releaseChecks),testResultsJson:JSON.stringify(body.testResults),toolUsageJson:JSON.stringify(usedTools),hintsUsed,firstHintSeconds,autonomousDiagnosis,independentCompletion,aiDependencyScore,aiJudgmentScore,engineeringOwnershipScore,aiClaimConfidence:task.aiSubmission?.confidence??0,aiClaimAccurate:Boolean(task.aiSubmission?.safe),architectureDriftDetected:Boolean(review.architectureDriftDetected),score,skillGainsJson:JSON.stringify(awardedGains),durationSeconds:Math.max(0,Number(body.durationSeconds)||0),completedAt:now}).returning();
    await db.insert(profiles).values({userId:user.userId,displayName:user.displayName,xp,streak:current?.streak??7,skillsJson:JSON.stringify(skills),updatedAt:now}).onConflictDoUpdate({target:profiles.userId,set:{displayName:user.displayName,xp,skillsJson:JSON.stringify(skills),updatedAt:now}});
    const events=Object.entries(awardedGains).map(([skill,delta])=>({userId:user.userId,attemptId:attempt.id,skill,delta,reason:`${task.type} 验收通过`,createdAt:now}));
    if(events.length)await db.insert(skillEvents).values(events);
    return response({ok:true,awarded:true,skills,xp,score,aiDependencyScore,aiJudgmentScore,engineeringOwnershipScore,specificationScore,releaseScore,systemModelingScore,planningScore,hypothesisScore,falsificationScore,observationScore,stateUpdateScore,toolSelectionScore,verificationScore,cognitiveDebtScore,reviewCoverage,understandingCoverage,diffReviewScore,scopeControlScore,architectureControlScore,changeRiskScore,generationReviewRatio,requirementQualityScore,solutionQualityScore,implementationPlanningScore,acceptanceQualityScore,engineeringConvergenceScore,attempt:attemptPayload(attempt)},user);
  }catch(error){return response({error:error instanceof Error?error.message:"save failed"},user,503)}
}
