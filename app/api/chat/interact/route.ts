import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator } from '@/lib/utils/agent-orchestrator';

/**
 * 将交互数据格式化为用户消息
 */
function formatInteractionAsUserMessage(data: any, result: any): string {
  const parts = [];
  
  // 添加用户的选择信息
  if (data.user_role) {
    parts.push(`我的身份是：${data.user_role}`);
  }
  if (data.use_case) {
    parts.push(`使用目的：${data.use_case}`);
  }
  if (data.style) {
    parts.push(`偏好风格：${data.style}`);
  }
  if (data.highlight_focus && data.highlight_focus.length > 0) {
    parts.push(`关注重点：${data.highlight_focus.join('、')}`);
  }
  
  // 如果没有具体信息，使用summary
  if (parts.length === 0 && result?.summary) {
    return result.summary;
  }
  
  return parts.length > 0 ? parts.join('，') : '我已经做出了选择';
}

export async function POST(req: NextRequest) {
  console.log(`\n🎯 [交互API] 收到POST请求 - ${new Date().toISOString()}`);
  
  try {
    const { sessionId, interactionType, data } = await req.json();
    
    // 🔧 防重复请求处理 - 忽略无效的系统消息
    const requestId = `${sessionId}-${Date.now()}`;

    // 🔧 忽略无效的系统消息
    if (data.type === 'system_loading' && data.sender === 'assistant') {
      console.log(`⏸️  [系统消息忽略] 忽略系统加载消息: ${data.stage}`);
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: 'System loading message ignored',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📋 [请求参数] SessionId: ${sessionId}, InteractionType: ${interactionType}`);
    console.log(`📄 [交互数据] ${JSON.stringify(data)}`);

    if (!sessionId || !interactionType) {
      console.error(`❌ [参数错误] SessionId 或 InteractionType 缺失`);
      return NextResponse.json(
        { error: 'SessionId and interactionType are required' },
        { status: 400 }
      );
    }

    // 获取会话数据
    console.log(`🔍 [会话查找] 查找会话 ${sessionId}`);
    const sessionData = agentOrchestrator.getSessionDataSync(sessionId);
    if (!sessionData) {
      console.error(`❌ [会话错误] 会话 ${sessionId} 未找到`);
      
      // 🔍 调试信息：检查会话存储状态
      try {
        const allSessions = await agentOrchestrator.getAllActiveSessions();
        console.log(`🔍 [调试] 当前活跃会话数: ${allSessions.length}`);
        console.log(`🔍 [调试] 会话ID列表:`, allSessions.map(s => s.id));
      } catch (debugError) {
        console.error(`⚠️ [调试] 获取活跃会话失败:`, debugError);
      }
      
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(`✅ [会话找到] 当前阶段: ${sessionData.metadata.progress.currentStage}, 进度: ${sessionData.metadata.progress.percentage}%`);

    // 处理用户交互
    console.log(`🎯 [开始处理] 调用 AgentOrchestrator.handleUserInteraction`);
    const result = await agentOrchestrator.handleUserInteraction(
      sessionId,
      interactionType,
      data,
      sessionData
    );

    console.log(`📋 [处理结果] Action: ${result?.action}, NextAgent: ${result?.nextAgent}`);

    // 🆕 处理自定义描述请求
    if (result?.action === 'request_custom_description') {
      console.log(`✏️ [自定义描述] 开始流式输出引导词`);
      
      // 设置等待状态
      const metadata = sessionData.metadata as any;
      metadata.waitingForCustomDescription = result.field;
      
      // 创建流式响应输出引导词
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // 获取引导词
            const promptText = result.description_prompt || '请详细描述您的需求...';
            console.log(`📝 [引导词] 准备流式输出 (长度: ${promptText.length})`);
            
            // 开始流式输出
            const characters = promptText.split('');
            let accumulatedText = '';
            
            for (let i = 0; i < characters.length; i++) {
              accumulatedText += characters[i];
              
              const streamChunk = {
                type: 'agent_response',
                immediate_display: {
                  reply: accumulatedText,
                  agent_name: 'WelcomeAgent',
                  timestamp: new Date().toISOString()
                },
                system_state: {
                  intent: 'requesting_description',
                  done: false,
                  progress: Math.round((i + 1) / characters.length * 100),
                  current_stage: '引导中...',
                  metadata: {
                    streaming: true,
                    field: result.field,
                    character_index: i + 1,
                    total_characters: characters.length
                  }
                }
              };
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`));
              
              // 控制输出速度 - 中文字符稍快一些
              const delay = characters[i].match(/[\u4e00-\u9fa5]/) ? 50 : 30;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            // 发送完成状态
            const finalChunk = {
              type: 'agent_response',
              immediate_display: {
                reply: accumulatedText,
                agent_name: 'WelcomeAgent',
                timestamp: new Date().toISOString()
              },
              system_state: {
                intent: 'awaiting_description',
                done: false,
                progress: 100,
                current_stage: '等待用户描述',
                metadata: {
                  streaming: false,
                  stream_complete: true,
                  field: result.field,
                  waiting_for_input: true
                }
              }
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            
            console.log(`✅ [流式完成] 引导词输出完成`);
            
          } catch (error) {
            console.error('❌ [流式错误] 引导词输出失败:', error);
            
            const errorChunk = {
              type: 'agent_response',
              immediate_display: {
                reply: '抱歉，系统出现问题，请直接在下方输入框描述您的需求。',
                agent_name: 'System',
                timestamp: new Date().toISOString()
              },
              system_state: {
                intent: 'error',
                done: false,
                metadata: { error: error instanceof Error ? error.message : String(error) }
              }
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
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

        // 🔧 修复：continue动作触发流式响应，让AI重新生成推荐
    if (result?.action === 'continue') {
      console.log(`🔄 [交互API] continue动作，触发流式AI推荐`);
      console.log(`📊 [Agent结果] ${JSON.stringify(result)}`);
      
      // 构造用户输入消息
      const userMessage = formatInteractionAsUserMessage(data, result);
      console.log(`📝 [用户消息] ${userMessage}`);
      
      // 调用AgentOrchestrator重新处理，让AI生成流式推荐
      console.log(`🤖 [AI调用] 让AI基于当前信息生成流式推荐选项`);
      const aiRecommendationGenerator = agentOrchestrator.processUserInputStreaming(
        sessionId,
        userMessage,
        sessionData
      );
      
      // 创建流式响应
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log(`🌊 [流式开始] AI推荐生成流开始`);
            
            for await (const chunk of aiRecommendationGenerator) {
              const sseData = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
            
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            console.log(`✅ [流式完成] AI推荐生成流完成`);
            
          } catch (error) {
            console.error('❌ [AI推荐错误]:', error);
            
            const errorResponse = {
              type: 'agent_response',
              immediate_display: {
                reply: '抱歉，生成推荐时出现问题，请刷新页面重试。',
                agent_name: 'System',
                timestamp: new Date().toISOString()
              },
              system_state: {
                intent: 'error',
                done: true,
                metadata: { error: error instanceof Error ? error.message : String(error) }
              }
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
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
              sessionData // 传入会话数据而不是nextAgent字符串
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

    // 其他情况的普通响应
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