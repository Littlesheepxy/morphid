import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator } from '@/lib/utils/agent-orchestrator';
import { SessionData } from '@/lib/types/session';
import { StreamableAgentResponse } from '@/lib/types/streaming';

// 模拟会话存储（实际应用中应该使用数据库）
const sessions = new Map<string, SessionData>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new NextResponse('Session ID is required', { status: 400 });
  }

  // 创建SSE响应
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // 使用Agent编排器处理初始会话
      const processInitialStream = async () => {
        try {
          // 发送初始欢迎消息，触发WelcomeAgent
          const responseGenerator = agentOrchestrator.processUserInputStreaming(
            sessionId,
            '初始化', // 空消息来触发欢迎流程
            undefined // 没有指定stage，让编排器自动确定
          );
          
          for await (const response of responseGenerator) {
            // 发送SSE数据
            const data = `data: ${JSON.stringify(response)}\n\n`;
            controller.enqueue(encoder.encode(data));
            
            // 如果响应完成但需要用户交互，不要关闭流
            if (response.system_state?.done && !response.interaction) {
              controller.enqueue(encoder.encode('event: complete\ndata: {}\n\n'));
              controller.close();
              return;
            }
          }
        } catch (error) {
          console.error('Agent processing error:', error);
          const errorResponse: StreamableAgentResponse = {
            immediate_display: {
              reply: '抱歉，系统出现了问题，请稍后重试。',
              agent_name: 'System',
              timestamp: new Date().toISOString()
            },
            system_state: {
              intent: 'error',
              done: true
            }
          };
          
          const data = `data: ${JSON.stringify(errorResponse)}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        }
      };

      // 开始处理
      processInitialStream();
    },

    cancel() {
      console.log('SSE stream cancelled');
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, currentStage } = await req.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Message and sessionId are required' },
        { status: 400 }
      );
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 使用Agent编排器处理流式输入
          const responseGenerator = agentOrchestrator.processUserInputStreaming(
            sessionId,
            message,
            currentStage
          );

          for await (const chunk of responseGenerator) {
            // 转换为SSE格式
            const sseData = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }

          // 发送结束标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error('Stream processing error:', error);
          
          // 发送错误信息
          const errorResponse: StreamableAgentResponse = {
            immediate_display: {
              reply: '抱歉，处理您的请求时遇到了问题。请重试。',
              agent_name: 'System',
              timestamp: new Date().toISOString()
            },
            system_state: {
              intent: 'error',
              done: true
            }
          };

          const sseData = `data: ${JSON.stringify(errorResponse)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
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
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 