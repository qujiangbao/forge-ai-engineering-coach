import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../../db";
import { taskCatalog } from "../../../../db/schema";

export const runtime="nodejs";
function authorized(request:Request){const expected=process.env.FORGE_ADMIN_KEY;return Boolean(expected&&request.headers.get("x-forge-admin-key")===expected)}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){if(!authorized(request))return NextResponse.json({error:"admin key required"},{status:401});const{id}=await params;const body=await request.json() as{published?:boolean};await getDb().update(taskCatalog).set({published:Boolean(body.published),updatedAt:new Date()}).where(eq(taskCatalog.id,id));return NextResponse.json({ok:true})}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){if(!authorized(request))return NextResponse.json({error:"admin key required"},{status:401});const{id}=await params;await getDb().delete(taskCatalog).where(eq(taskCatalog.id,id));return NextResponse.json({ok:true})}
