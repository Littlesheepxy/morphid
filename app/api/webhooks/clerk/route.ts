import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
import { syncUserWithClerk } from "@/lib/supabase-server"
import { syncUserAcrossProjects, handleUserDeletion } from "@/lib/cross-project-sync"

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error("Missing CLERK_WEBHOOK_SECRET")
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 })
  }

  // 获取headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 })
  }

  // 获取请求体
  const payload = await req.text()

  // 创建Webhook实例
  const wh = new Webhook(webhookSecret)

  let evt: any

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // 处理不同的事件类型
  const { type, data } = evt

  try {
    switch (type) {
      case "user.created":
        console.log(`Processing user.created for user ${data.id}`)
        await syncUserAcrossProjects(data)
        break
      
      case "user.updated":
        console.log(`Processing user.updated for user ${data.id}`)
        await syncUserAcrossProjects(data)
        break
      
      case "user.deleted":
        console.log(`Processing user.deleted for user ${data.id}`)
        await handleUserDeletion(data.id)
        break
      
      default:
        console.log(`Unhandled webhook type: ${type}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${type}`,
      userId: data.id 
    })
  } catch (error) {
    console.error(`Error processing webhook ${type}:`, error)
    return NextResponse.json({ 
      error: "Processing failed", 
      type,
      userId: data.id 
    }, { status: 500 })
  }
} 