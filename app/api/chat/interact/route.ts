import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator } from '@/lib/utils/agent-orchestrator';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, interactionType, data } = await req.json();

    if (!sessionId || !interactionType) {
      return NextResponse.json(
        { error: 'SessionId and interactionType are required' },
        { status: 400 }
      );
    }

    // 获取会话数据
    const sessionData = agentOrchestrator.getSessionData(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // 处理用户交互
    const result = await agentOrchestrator.handleUserInteraction(
      sessionId,
      interactionType,
      data,
      sessionData
    );

    // 如果需要推进到下一阶段
    if (result?.action === 'advance' && result?.nextAgent) {
      // 创建流式响应以启动下一个Agent
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // 发送确认消息
            const confirmResponse = {
              immediate_display: {
                reply: `✅ ${result.summary || '信息已确认'}，正在推进到下一阶段...`,
                agent_name: 'System',
                timestamp: new Date().toISOString()
              },
              system_state: {
                intent: 'advancing',
                done: false,
                progress: sessionData.metadata.progress.percentage,
                current_stage: '推进中'
              }
            };
            
            const confirmData = `data: ${JSON.stringify(confirmResponse)}\n\n`;
            controller.enqueue(encoder.encode(confirmData));
            
            // 启动下一个Agent
            const nextAgentGenerator = agentOrchestrator.processUserInputStreaming(
              sessionId,
              '', // 空消息，让下一个Agent自动启动
              result.nextAgent
            );

            for await (const chunk of nextAgentGenerator) {
              const sseData = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();

          } catch (error) {
            console.error('Next agent startup error:', error);
            const errorResponse = {
              immediate_display: {
                reply: '推进到下一阶段时遇到了问题，请刷新页面重试。',
                agent_name: 'System',
                timestamp: new Date().toISOString()
              },
              system_state: {
                intent: 'error',
                done: true
              }
            };

            const errorData = `data: ${JSON.stringify(errorResponse)}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // 普通响应（继续当前阶段）
    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Interaction handling error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to handle user interaction',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 