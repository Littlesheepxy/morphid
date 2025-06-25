'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WebContainerService, type ContainerStatus } from '@/lib/services/webcontainer-service';

export default function TestWebContainerPage() {
  const [status, setStatus] = useState<ContainerStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [service, setService] = useState<WebContainerService | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // 检查浏览器支持
    const checkSupport = async () => {
      try {
        // 检查是否在安全上下文中
        const isSecure = window.isSecureContext;
        
        // 检查SharedArrayBuffer支持
        const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
        
        // 检查跨域隔离
        const isCrossOriginIsolated = window.crossOriginIsolated;
        
        console.log('浏览器环境检查:', {
          isSecure,
          hasSharedArrayBuffer,
          isCrossOriginIsolated,
          userAgent: navigator.userAgent
        });

        setLogs(prev => [...prev, 
          `🔍 浏览器环境检查:`,
          `  - 安全上下文: ${isSecure ? '✅' : '❌'}`,
          `  - SharedArrayBuffer: ${hasSharedArrayBuffer ? '✅' : '❌'}`,
          `  - 跨域隔离: ${isCrossOriginIsolated ? '✅' : '❌'}`
        ]);

        const supported = isSecure && hasSharedArrayBuffer;
        setIsSupported(supported);

        if (!supported) {
          setLogs(prev => [...prev, '❌ 浏览器不支持WebContainer']);
        }
      } catch (error) {
        console.error('环境检查失败:', error);
        setLogs(prev => [...prev, `❌ 环境检查失败: ${error}`]);
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  const initializeService = async () => {
    try {
      setLogs(prev => [...prev, '🔧 初始化WebContainer服务...']);
      
      const newService = new WebContainerService({
        clientId: 'wc_api_littlesheepxy_33595e6cd89a5813663cd3f70b26e12d',
        workdirName: 'test-project'
      });

      // 监听状态变化
      newService.onStatusChange((newStatus) => {
        console.log('状态变化:', newStatus);
        setStatus(newStatus);
      });

      // 监听日志
      newService.onLog((log) => {
        console.log('WebContainer日志:', log);
        setLogs(prev => [...prev, log]);
      });

      setService(newService);

      // 初始化认证
      setLogs(prev => [...prev, '🔐 开始认证...']);
      await newService.initAuth();
      setLogs(prev => [...prev, '✅ 认证成功']);

      // 启动WebContainer
      setLogs(prev => [...prev, '🚀 启动WebContainer...']);
      await newService.boot();
      setLogs(prev => [...prev, '✅ WebContainer启动成功']);

    } catch (error) {
      console.error('初始化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLogs(prev => [...prev, `❌ 初始化失败: ${errorMessage}`]);
      setStatus('error');
    }
  };

  const testBasicFiles = async () => {
    if (!service) {
      setLogs(prev => [...prev, '❌ 服务未初始化']);
      return;
    }

    try {
      setLogs(prev => [...prev, '📁 测试文件操作...']);
      
      const testFiles = [
        {
          filename: 'package.json',
          content: JSON.stringify({
            name: 'test-project',
            version: '1.0.0',
            scripts: {
              dev: 'echo "Hello WebContainer"'
            }
          }, null, 2),
          language: 'json',
          type: 'config' as const
        },
        {
          filename: 'index.html',
          content: `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>WebContainer Test</h1>
</body>
</html>`,
          language: 'html',
          type: 'page' as const
        }
      ];

      await service.mountFiles(testFiles);
      setLogs(prev => [...prev, '✅ 文件挂载成功']);

    } catch (error) {
      console.error('文件测试失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLogs(prev => [...prev, `❌ 文件测试失败: ${errorMessage}`]);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>WebContainer 连接测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 状态显示 */}
          <div className="flex items-center gap-4">
            <Badge variant={status === 'running' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
              状态: {status}
            </Badge>
            {isSupported !== null && (
              <Badge variant={isSupported ? 'default' : 'destructive'}>
                浏览器支持: {isSupported ? '✅' : '❌'}
              </Badge>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button 
              onClick={initializeService} 
              disabled={!isSupported || status === 'initializing'}
            >
              初始化WebContainer
            </Button>
            <Button 
              onClick={testBasicFiles} 
              disabled={!service || status !== 'running'}
              variant="outline"
            >
              测试文件操作
            </Button>
            <Button 
              onClick={() => setLogs([])} 
              variant="outline"
            >
              清除日志
            </Button>
          </div>

          {/* 日志显示 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">运行日志</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">暂无日志</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* 帮助信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">故障排除</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>如果WebContainer无法连接，请检查：</strong></p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>确保网站运行在HTTPS环境下</li>
                <li>检查浏览器是否支持SharedArrayBuffer</li>
                <li>确认跨域隔离头部设置正确</li>
                <li>检查网络连接是否正常</li>
                <li>尝试清除浏览器缓存</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
} 