import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../db";
import { taskCatalog } from "../../../db/schema";
import { tasks, type Task } from "../../data";

export const runtime="nodejs";
function authorized(request:Request){const expected=process.env.FORGE_ADMIN_KEY;return Boolean(expected&&request.headers.get("x-forge-admin-key")===expected)}
function slug(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||crypto.randomUUID().slice(0,8)}

export async function GET(request:Request){
  const url=new URL(request.url);const mode=url.searchParams.get("mode");
  if(mode==="catalog"&&!authorized(request))return NextResponse.json({error:"admin key required"},{status:401});
  try{const rows=await getDb().select().from(taskCatalog).orderBy(desc(taskCatalog.updatedAt));return NextResponse.json({builtIn:tasks.map(({id,title,type,difficultyLevel,skills})=>({id,title,type,difficultyLevel,skills,published:true})),custom:rows.map(row=>({...row,task:JSON.parse(row.taskJson)})),adminEnabled:Boolean(process.env.FORGE_ADMIN_KEY)})}
  catch{return NextResponse.json({builtIn:tasks.map(({id,title,type,difficultyLevel,skills})=>({id,title,type,difficultyLevel,skills,published:true})),custom:[],adminEnabled:Boolean(process.env.FORGE_ADMIN_KEY)})}
}

export async function POST(request:Request){
  if(!authorized(request))return NextResponse.json({error:"admin key required"},{status:401});
  const input=await request.json() as Partial<Task>&{published?:boolean};
  if(!input.title?.trim()||!input.summary?.trim()||!input.context?.trim()||!input.solution?.trim())return NextResponse.json({error:"title, summary, context and solution are required"},{status:400});
  const id=`custom-${slug(input.id||input.title)}`;const now=new Date();
  const task:Task={id,day:"ADMIN / CUSTOM",type:input.type||"REAL PROJECT",title:input.title.trim(),summary:input.summary.trim(),duration:input.duration||40,difficulty:input.difficulty||"进阶",difficultyLevel:input.difficultyLevel||3,skills:input.skills?.length?input.skills:["Debug","Acceptance Testing"],facts:input.facts||[["来源","管理员"],["模式","真实项目"]],criteria:input.criteria?.length===4?input.criteria:["根因可验证","最小改动","异常路径覆盖","证据可复现"],prompt:input.prompt||"先写下事实、假设、反证条件和第一个检查点。",contextTitle:input.contextTitle||"workspace/main.ts",context:input.context,logs:input.logs||["custom task loaded","waiting for diagnosis"],hints:input.hints?.length===3?input.hints:["区分事实与推测。","寻找第一个异常边界。","设计能证伪假设的实验。"],patchLabel:"记录我的改动",solution:input.solution,evidencePlaceholder:"记录输入、输出、数据状态和证明理由。",gains:input.gains||{Debug:5,"Acceptance Testing":5},bugType:input.bugType||"自定义",rootCause:input.rootCause||"由管理员定义",files:input.files,tools:input.tools||["code","logs","tests"]};
  await getDb().insert(taskCatalog).values({id,title:task.title,taskJson:JSON.stringify(task),published:input.published!==false,createdAt:now,updatedAt:now}).onConflictDoUpdate({target:taskCatalog.id,set:{title:task.title,taskJson:JSON.stringify(task),published:input.published!==false,updatedAt:now}});
  return NextResponse.json({ok:true,task});
}
