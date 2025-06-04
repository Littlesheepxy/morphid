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
      const allSessions = agentOrchestrator.getAllActiveSessions();
      console.log(`🔍 [调试] 当前活跃会话数: ${allSessions.length}`);
      console.log(`🔍 [调试] 会话ID列表:`, allSessions.map(s => s.id));
      
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

    // 🔧 修复：continue动作也需要触发AI响应
    if (result?.action === 'continue') {
      console.log(`🔄 [交互API] continue动作，重新调用AI生成响应`);
      
      // 🔧 新增：将交互结果转换为用户消息
      const userMessage = formatInteractionAsUserMessage(data, result);
      console.log(`🔄 [继续处理] 转换用户消息: ${userMessage}`);
      
      // 🔧 新增：重新调用Agent，传入用户消息和对话历史
      console.log(`🤖 [重新调用Agent] 开始流式响应处理`);
      
      // 🎯 UX优化：立即返回处理状态，然后启动流式响应
      const response = new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            
            // 1. 立即发送初始状态
            const initialChunk = {
              type: 'processing',
              message: '正在为您生成个性化建议...',
              timestamp: new Date().toISOString()
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialChunk)}\n\n`));
            
            try {
              // 2. 调用Agent生成响应
              const agentGenerator = agentOrchestrator.processUserInputStreaming(
                sessionId,
                userMessage,
                sessionData
              );

              // 3. 流式处理Agent响应
              for await (const chunk of agentGenerator) {
                console.log(`📤 [流式输出] 发送Agent响应块`);
                
                // 🎯 关键优化：检查是否包含建议，优先发送
                if (chunk.interaction?.elements) {
                  const suggestionsChunk = {
                    type: 'suggestions_ready',
                    interaction: chunk.interaction,
                    quick_display: true,
                    timestamp: new Date().toISOString()
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(suggestionsChunk)}\n\n`));
                }
                
                // 发送完整响应块
                const streamChunk = {
                  type: 'agent_response',
                  data: chunk,
                  timestamp: new Date().toISOString()
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`));
              }
              
              // 4. 发送完成信号
              const doneChunk = {
                type: 'done',
                message: '建议生成完成',
                timestamp: new Date().toISOString()
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              
            } catch (error) {
              console.error('流式响应错误:', error);
              const errorChunk = {
                type: 'error',
                message: '生成建议时出现问题，请重试',
                timestamp: new Date().toISOString()
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
            } finally {
              controller.close();
            }
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
      
      return response;
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