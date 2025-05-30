import { StreamChunk, StreamableAgentResponse } from '@/lib/types/streaming';

export class JSONStreamer {
  private buffer: string = '';
  private depth: number = 0;
  private inString: boolean = false;
  private escaped: boolean = false;
  private currentPath: string[] = [];
  private callbacks: Map<string, (chunk: StreamChunk) => void> = new Map();

  constructor() {
    this.reset();
  }

  /**
   * 重置流处理器状态
   */
  reset(): void {
    this.buffer = '';
    this.depth = 0;
    this.inString = false;
    this.escaped = false;
    this.currentPath = [];
  }

  /**
   * 注册路径监听回调
   */
  onPath(path: string, callback: (chunk: StreamChunk) => void): void {
    this.callbacks.set(path, callback);
  }

  /**
   * 移除路径监听
   */
  offPath(path: string): void {
    this.callbacks.delete(path);
  }

  /**
   * 处理新的数据块
   */
  processChunk(chunk: string): StreamChunk[] {
    this.buffer += chunk;
    const results: StreamChunk[] = [];

    try {
      // 尝试解析完整的JSON
      const parsed = this.tryParseComplete();
      if (parsed) {
        results.push({
          type: 'complete',
          value: parsed,
          partial: false
        });
        this.reset();
        return results;
      }

      // 尝试部分解析
      const partialResults = this.tryParsePartial();
      results.push(...partialResults);

    } catch (error) {
      results.push({
        type: 'error',
        value: error instanceof Error ? error.message : 'Unknown parsing error'
      });
    }

    return results;
  }

  /**
   * 尝试解析完整JSON
   */
  private tryParseComplete(): any {
    if (!this.buffer.trim()) return null;
    
    try {
      return JSON.parse(this.buffer);
    } catch {
      return null;
    }
  }

  /**
   * 尝试部分解析
   */
  private tryParsePartial(): StreamChunk[] {
    const results: StreamChunk[] = [];
    let i = 0;
    
    while (i < this.buffer.length) {
      const char = this.buffer[i];
      
      if (this.inString) {
        if (this.escaped) {
          this.escaped = false;
        } else if (char === '\\') {
          this.escaped = true;
        } else if (char === '"') {
          this.inString = false;
          // 尝试提取字符串值
          const stringValue = this.extractStringValue(i);
          if (stringValue) {
            results.push({
              type: 'data',
              path: [...this.currentPath],
              value: stringValue,
              partial: true
            });
          }
        }
      } else {
        switch (char) {
          case '"':
            this.inString = true;
            break;
          case '{':
            this.depth++;
            this.currentPath.push('object');
            break;
          case '}':
            this.depth--;
            this.currentPath.pop();
            break;
          case '[':
            this.depth++;
            this.currentPath.push('array');
            break;
          case ']':
            this.depth--;
            this.currentPath.pop();
            break;
          case ':':
            // 处理键值对
            const key = this.extractRecentKey(i);
            if (key) {
              this.currentPath.push(key);
            }
            break;
          case ',':
            // 完成当前值的处理
            if (this.currentPath.length > 0) {
              this.currentPath.pop();
            }
            break;
        }
      }
      
      i++;
    }

    return results;
  }

  /**
   * 提取字符串值
   */
  private extractStringValue(endIndex: number): string | null {
    let startIndex = endIndex;
    
    // 向后查找字符串开始位置
    while (startIndex > 0 && this.buffer[startIndex] !== '"') {
      startIndex--;
    }
    
    if (startIndex === 0) return null;
    
    try {
      return this.buffer.slice(startIndex + 1, endIndex);
    } catch {
      return null;
    }
  }

  /**
   * 提取最近的键名
   */
  private extractRecentKey(colonIndex: number): string | null {
    let startIndex = colonIndex - 1;
    
    // 跳过空白字符
    while (startIndex >= 0 && /\s/.test(this.buffer[startIndex])) {
      startIndex--;
    }
    
    if (startIndex < 0 || this.buffer[startIndex] !== '"') return null;
    
    let keyStart = startIndex - 1;
    while (keyStart >= 0 && this.buffer[keyStart] !== '"') {
      keyStart--;
    }
    
    if (keyStart < 0) return null;
    
    return this.buffer.slice(keyStart + 1, startIndex);
  }

  /**
   * 发出事件给监听器
   */
  private emit(chunk: StreamChunk): void {
    const pathStr = chunk.path?.join('.') || '';
    const callback = this.callbacks.get(pathStr);
    if (callback) {
      callback(chunk);
    }
    
    // 也发送给通用监听器
    const generalCallback = this.callbacks.get('*');
    if (generalCallback) {
      generalCallback(chunk);
    }
  }
}

/**
 * Agent响应流处理器
 */
export class AgentResponseStreamer {
  private jsonStreamer: JSONStreamer;
  private currentResponse: Partial<StreamableAgentResponse> = {};
  private onUpdateCallback?: (response: Partial<StreamableAgentResponse>) => void;

  constructor() {
    this.jsonStreamer = new JSONStreamer();
    this.setupListeners();
  }

  /**
   * 设置更新回调
   */
  onUpdate(callback: (response: Partial<StreamableAgentResponse>) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * 处理新的流数据
   */
  processStream(chunk: string): void {
    const results = this.jsonStreamer.processChunk(chunk);
    
    results.forEach(result => {
      this.handleStreamChunk(result);
    });
  }

  /**
   * 重置流处理器
   */
  reset(): void {
    this.jsonStreamer.reset();
    this.currentResponse = {};
  }

  /**
   * 设置流监听器
   */
  private setupListeners(): void {
    // 监听立即显示内容
    this.jsonStreamer.onPath('immediate_display.reply', (chunk) => {
      if (!this.currentResponse.immediate_display) {
        this.currentResponse.immediate_display = { reply: '' };
      }
      this.currentResponse.immediate_display.reply = chunk.value;
      this.notifyUpdate();
    });

    // 监听交互元素
    this.jsonStreamer.onPath('interaction', (chunk) => {
      this.currentResponse.interaction = chunk.value;
      this.notifyUpdate();
    });

    // 监听系统状态
    this.jsonStreamer.onPath('system_state', (chunk) => {
      this.currentResponse.system_state = chunk.value;
      this.notifyUpdate();
    });

    // 监听会话上下文
    this.jsonStreamer.onPath('session_context', (chunk) => {
      this.currentResponse.session_context = chunk.value;
      this.notifyUpdate();
    });

    // 监听完整响应
    this.jsonStreamer.onPath('*', (chunk) => {
      if (chunk.type === 'complete') {
        this.currentResponse = chunk.value;
        this.notifyUpdate();
      }
    });
  }

  /**
   * 处理流数据块
   */
  private handleStreamChunk(chunk: StreamChunk): void {
    switch (chunk.type) {
      case 'start':
        this.currentResponse = {};
        break;
      
      case 'data':
        this.updateResponseWithPath(chunk.path || [], chunk.value);
        break;
      
      case 'complete':
        this.currentResponse = chunk.value;
        this.notifyUpdate();
        break;
      
      case 'error':
        console.error('Stream parsing error:', chunk.value);
        break;
    }
  }

  /**
   * 根据路径更新响应对象
   */
  private updateResponseWithPath(path: string[], value: any): void {
    let current: any = this.currentResponse;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    if (path.length > 0) {
      current[path[path.length - 1]] = value;
    }
    
    this.notifyUpdate();
  }

  /**
   * 通知更新
   */
  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback({ ...this.currentResponse });
    }
  }

  /**
   * 获取当前响应
   */
  getCurrentResponse(): Partial<StreamableAgentResponse> {
    return { ...this.currentResponse };
  }
}

/**
 * 创建SSE (Server-Sent Events) 流处理器
 */
export function createSSEProcessor(
  url: string,
  onMessage: (response: Partial<StreamableAgentResponse>) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): { start: () => void; stop: () => void } {
  let eventSource: EventSource | null = null;
  const streamer = new AgentResponseStreamer();
  
  streamer.onUpdate(onMessage);

  return {
    start: () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(url);
      
      eventSource.onmessage = (event) => {
        try {
          streamer.processStream(event.data);
        } catch (error) {
          onError?.(error instanceof Error ? error : new Error('Stream processing error'));
        }
      };

      eventSource.onerror = (event) => {
        onError?.(new Error('EventSource error'));
      };

      eventSource.addEventListener('complete', () => {
        onComplete?.();
        eventSource?.close();
      });
    },

    stop: () => {
      eventSource?.close();
      eventSource = null;
      streamer.reset();
    }
  };
}
