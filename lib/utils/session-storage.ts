/**
 * 会话存储管理
 * 
 * 负责会话数据的持久化存储，支持浏览器localStorage和服务器文件系统两种存储方式
 */

import { SessionData } from '@/lib/types/session';

/**
 * 会话存储管理器
 * 
 * 提供统一的存储接口，自动根据环境选择合适的存储方式
 */
export class SessionStorageManager {
  private readonly SESSION_STORAGE_KEY = 'heysme_sessions';
  private readonly SERVER_STORAGE_PATH = '.sessions'; // 移除process.cwd()的依赖

  /**
   * 从存储中加载所有会话数据
   * @returns 会话数据Map
   */
  async loadAllSessions(): Promise<Map<string, SessionData>> {
    const sessions = new Map<string, SessionData>();
    
    try {
      if (this.isBrowserEnvironment()) {
        await this.loadFromLocalStorage(sessions);
      } else {
        await this.loadFromFileSystem(sessions);
      }
    } catch (error) {
      console.warn('⚠️ [存储] 加载会话失败:', error);
    }

    return sessions;
  }

  /**
   * 保存所有会话数据到存储
   * @param sessions 会话数据Map
   */
  async saveAllSessions(sessions: Map<string, SessionData>): Promise<void> {
    try {
      if (this.isBrowserEnvironment()) {
        await this.saveToLocalStorage(sessions);
      } else {
        await this.saveToFileSystem(sessions);
      }
    } catch (error) {
      console.warn('⚠️ [存储] 保存会话失败:', error);
    }
  }

  /**
   * 删除单个会话
   * @param sessionId 会话ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      if (!this.isBrowserEnvironment()) {
        const fs = await import('fs');
        const path = await import('path');
        const storagePath = path.join(process.cwd(), this.SERVER_STORAGE_PATH);
        const filePath = path.join(storagePath, `${sessionId}.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  [存储] 删除会话文件: ${sessionId}`);
        }
      }
      // localStorage的删除由saveAllSessions处理
    } catch (error) {
      console.warn(`⚠️ [存储] 删除会话失败 ${sessionId}:`, error);
    }
  }

  /**
   * 清理过期的会话文件
   * @param expiredThreshold 过期时间阈值（毫秒）
   */
  async cleanupExpiredSessions(expiredThreshold: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (this.isBrowserEnvironment()) {
      return 0; // 浏览器环境的清理由SessionManager处理
    }

    let cleanedCount = 0;
    
    try {
      const fs = await import('fs');
      const path = await import('path');
      const storagePath = path.join(process.cwd(), this.SERVER_STORAGE_PATH);
      
      if (fs.existsSync(storagePath)) {
        const files = fs.readdirSync(storagePath);
        const now = Date.now();
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(storagePath, file);
            const stats = fs.statSync(filePath);
            
            if (now - stats.mtime.getTime() > expiredThreshold) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        }
        
        if (cleanedCount > 0) {
          console.log(`🧹 [存储] 清理了 ${cleanedCount} 个过期会话文件`);
        }
      }
    } catch (error) {
      console.warn('⚠️ [存储] 清理过期会话失败:', error);
    }

    return cleanedCount;
  }

  /**
   * 从localStorage加载会话
   */
  private async loadFromLocalStorage(sessions: Map<string, SessionData>): Promise<void> {
    if (!window.localStorage) return;

    const storedSessions = localStorage.getItem(this.SESSION_STORAGE_KEY);
    if (storedSessions) {
      const sessionsData = JSON.parse(storedSessions);
      
      for (const [sessionId, sessionData] of Object.entries(sessionsData)) {
        const session = this.deserializeSession(sessionData as any);
        sessions.set(sessionId, session);
      }
      
      console.log(`✅ [存储-浏览器] 从localStorage加载了 ${sessions.size} 个会话`);
    }
  }

  /**
   * 从文件系统加载会话
   */
  private async loadFromFileSystem(sessions: Map<string, SessionData>): Promise<void> {
    if (this.isBrowserEnvironment()) return;

    try {
      const fs = await import('fs');
      const path = await import('path');
      const storagePath = path.join(process.cwd(), this.SERVER_STORAGE_PATH);
      
      if (!fs.existsSync(storagePath)) return;

      const files = fs.readdirSync(storagePath);
      let loadedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const sessionId = file.replace('.json', '');
            const filePath = path.join(storagePath, file);
            const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const session = this.deserializeSession(sessionData);
            sessions.set(sessionId, session);
            loadedCount++;
          } catch (error) {
            console.warn(`⚠️ [存储] 加载会话文件失败 ${file}:`, error);
          }
        }
      }
      
      if (loadedCount > 0) {
        console.log(`✅ [存储-服务器] 从文件系统加载了 ${loadedCount} 个会话`);
      }
    } catch (error) {
      console.warn('⚠️ [存储] 从文件系统恢复会话失败:', error);
    }
  }

  /**
   * 保存到localStorage
   */
  private async saveToLocalStorage(sessions: Map<string, SessionData>): Promise<void> {
    if (!window.localStorage) return;

    const sessionsObj: Record<string, any> = {};
    const sessionEntries = Array.from(sessions.entries());
    
    for (const [sessionId, sessionData] of sessionEntries) {
      sessionsObj[sessionId] = this.serializeSession(sessionData);
    }
    
    localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionsObj));
  }

  /**
   * 保存到文件系统
   */
  private async saveToFileSystem(sessions: Map<string, SessionData>): Promise<void> {
    if (this.isBrowserEnvironment()) return;

    try {
      const fs = await import('fs');
      const path = await import('path');
      const storagePath = path.join(process.cwd(), this.SERVER_STORAGE_PATH);
      
      // 确保存储目录存在
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const sessionEntries = Array.from(sessions.entries());
      
      for (const [sessionId, sessionData] of sessionEntries) {
        try {
          const filePath = path.join(storagePath, `${sessionId}.json`);
          const serializedSession = this.serializeSession(sessionData);
          fs.writeFileSync(filePath, JSON.stringify(serializedSession, null, 2));
        } catch (error) {
          console.warn(`⚠️ [存储] 保存会话文件失败 ${sessionId}:`, error);
        }
      }
    } catch (error) {
      console.warn('⚠️ [存储] 保存会话到文件系统失败:', error);
    }
  }

  /**
   * 序列化会话数据（处理日期对象）
   */
  private serializeSession(session: SessionData): any {
    // 辅助函数：安全地转换日期为ISO字符串
    const safeToISOString = (dateValue: any): string => {
      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }
      if (typeof dateValue === 'string') {
        // 如果已经是字符串，尝试验证是否为有效的ISO日期格式
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      // 如果无法转换，使用当前时间
      return new Date().toISOString();
    };

    return {
      ...session,
      metadata: {
        ...session.metadata,
        createdAt: safeToISOString(session.metadata.createdAt),
        updatedAt: safeToISOString(session.metadata.updatedAt),
        lastActive: safeToISOString(session.metadata.lastActive)
      },
      conversationHistory: session.conversationHistory.map(entry => ({
        ...entry,
        timestamp: safeToISOString(entry.timestamp),
        userInteraction: entry.userInteraction ? {
          ...entry.userInteraction,
          timestamp: safeToISOString(entry.userInteraction.timestamp)
        } : undefined
      })),
      agentFlow: session.agentFlow.map(flow => ({
        ...flow,
        startTime: safeToISOString(flow.startTime),
        endTime: flow.endTime ? safeToISOString(flow.endTime) : undefined
      }))
    };
  }

  /**
   * 反序列化会话数据（恢复日期对象）
   */
  private deserializeSession(sessionData: any): SessionData {
    // 辅助函数：安全地转换字符串为Date对象
    const safeToDate = (dateValue: any): Date => {
      if (dateValue instanceof Date) {
        return dateValue;
      }
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      // 如果无法转换，使用当前时间
      return new Date();
    };

    return {
      ...sessionData,
      metadata: {
        ...sessionData.metadata,
        createdAt: safeToDate(sessionData.metadata.createdAt),
        updatedAt: safeToDate(sessionData.metadata.updatedAt),
        lastActive: safeToDate(sessionData.metadata.lastActive)
      },
      conversationHistory: sessionData.conversationHistory.map((entry: any) => ({
        ...entry,
        timestamp: safeToDate(entry.timestamp),
        userInteraction: entry.userInteraction ? {
          ...entry.userInteraction,
          timestamp: safeToDate(entry.userInteraction.timestamp)
        } : undefined
      })),
      agentFlow: sessionData.agentFlow.map((flow: any) => ({
        ...flow,
        startTime: safeToDate(flow.startTime),
        endTime: flow.endTime ? safeToDate(flow.endTime) : undefined
      }))
    };
  }

  /**
   * 检查是否为浏览器环境
   */
  private isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    environment: 'browser' | 'server';
    storageLocation: string;
    totalFiles?: number;
    totalSize?: number;
  }> {
    if (this.isBrowserEnvironment()) {
      const data = localStorage.getItem(this.SESSION_STORAGE_KEY);
      return {
        environment: 'browser',
        storageLocation: 'localStorage',
        totalSize: data ? data.length : 0
      };
    } else {
      let totalFiles = 0;
      let totalSize = 0;
      
      try {
        const fs = await import('fs');
        const path = await import('path');
        const storagePath = path.join(process.cwd(), this.SERVER_STORAGE_PATH);
        
        if (fs.existsSync(storagePath)) {
          const files = fs.readdirSync(storagePath);
          totalFiles = files.filter((f: string) => f.endsWith('.json')).length;
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(storagePath, file);
              const stats = fs.statSync(filePath);
              totalSize += stats.size;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ [存储] 获取存储统计失败:', error);
      }
      
      return {
        environment: 'server',
        storageLocation: this.SERVER_STORAGE_PATH,
        totalFiles,
        totalSize
      };
    }
  }
}

// 导出单例实例
export const sessionStorage = new SessionStorageManager(); 