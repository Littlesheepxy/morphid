import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseDocumentService } from '@/lib/services/supabase-document-service';

export async function POST(req: NextRequest) {
  try {
    // 1. 认证检查
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 2. 解析表单数据
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    const parseImmediately = formData.get('parseImmediately') === 'true';
    const extractMode = (formData.get('extractMode') as string) || 'general';

    if (!file) {
      return NextResponse.json(
        { error: '未提供文件' },
        { status: 400 }
      );
    }

    console.log(`📤 [API] 用户 ${userId} 上传文件: ${file.name}`);

    // 3. 上传文档
    const uploadedDocument = await supabaseDocumentService.uploadDocument(
      file,
      userId,
      {
        sessionId: sessionId || undefined,
        parseImmediately,
        extractMode: extractMode as 'general' | 'resume' | 'comprehensive'
      }
    );

    console.log(`✅ [API] 文档上传成功: ${uploadedDocument.id}`);

    return NextResponse.json({
      success: true,
      document: uploadedDocument
    });

  } catch (error) {
    console.error('❌ [API] 文档上传失败:', error);
    
    return NextResponse.json(
      { 
        error: '文档上传失败', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. 认证检查
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 2. 获取查询参数
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    // 3. 获取用户文档列表
    const documents = await supabaseDocumentService.getUserDocuments(
      userId,
      sessionId || undefined
    );

    return NextResponse.json({
      success: true,
      documents
    });

  } catch (error) {
    console.error('❌ [API] 获取文档列表失败:', error);
    
    return NextResponse.json(
      { 
        error: '获取文档列表失败', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 