import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator } from '@/lib/utils/agent-orchestrator';

// 创建新会话
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { initialInput } = body;

    // 创建新会话
    const sessionId = agentOrchestrator.createSession(initialInput);

    return NextResponse.json({
      success: true,
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 获取会话状态
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'SessionId is required' },
        { status: 400 }
      );
    }

    // 获取会话状态
    const sessionStatus = agentOrchestrator.getSessionStatus(sessionId);

    if (!sessionStatus) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: sessionStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 重置会话到指定阶段
export async function PATCH(req: NextRequest) {
  try {
    const { sessionId, targetStage } = await req.json();

    if (!sessionId || !targetStage) {
      return NextResponse.json(
        { error: 'SessionId and targetStage are required' },
        { status: 400 }
      );
    }

    // 重置会话
    const success = await agentOrchestrator.resetToStage(sessionId, targetStage);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reset session or invalid stage' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Session reset to ${targetStage}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session reset error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 