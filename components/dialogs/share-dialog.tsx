'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Share2, 
  Copy, 
  Check, 
  Eye, 
  Lock, 
  Calendar,
  BarChart3,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
  pageId: string;
  userId: string;
  pageTitle: string;
  onShare?: (shareData: any) => void;
  children?: React.ReactNode;
}

export function ShareDialog({ 
  pageId, 
  userId, 
  pageTitle, 
  onShare,
  children 
}: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  // 分享选项状态
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState('never');
  const [enableAnalytics, setEnableAnalytics] = useState(true);
  const [allowedViewers, setAllowedViewers] = useState('');

  const generateShareLink = async () => {
    setIsGenerating(true);
    
    try {
      const requestData: any = {
        pageId,
        userId,
        analytics: enableAnalytics,
      };

      // 添加密码
      if (usePassword && password.trim()) {
        requestData.password = password.trim();
      }

      // 添加过期时间
      if (expiresIn !== 'never') {
        const expiresAt = new Date();
        switch (expiresIn) {
          case '1hour':
            expiresAt.setHours(expiresAt.getHours() + 1);
            break;
          case '1day':
            expiresAt.setDate(expiresAt.getDate() + 1);
            break;
          case '7days':
            expiresAt.setDate(expiresAt.getDate() + 7);
            break;
          case '30days':
            expiresAt.setDate(expiresAt.getDate() + 30);
            break;
        }
        requestData.expiresAt = expiresAt.toISOString();
      }

      // 添加允许的查看者
      if (allowedViewers.trim()) {
        const emails = allowedViewers.split(',').map(email => email.trim()).filter(Boolean);
        if (emails.length > 0) {
          requestData.allowedViewers = emails;
        }
      }

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成分享链接失败');
      }

      const data = await response.json();
      
      if (data.success) {
        setShareData(data.data);
        onShare?.(data.data);
      } else {
        throw new Error(data.error || '生成分享链接失败');
      }

    } catch (error) {
      console.error('生成分享链接失败:', error);
      // TODO: 显示错误提示
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const resetDialog = () => {
    setShareData(null);
    setPassword('');
    setUsePassword(false);
    setExpiresIn('never');
    setEnableAnalytics(true);
    setAllowedViewers('');
    setCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            分享
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            分享页面
          </DialogTitle>
          <DialogDescription>
            创建分享链接来让其他人访问「{pageTitle}」
          </DialogDescription>
        </DialogHeader>

        {shareData ? (
          // 显示生成的分享链接
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">分享链接已生成</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">分享链接</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={shareData.shareUrl}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(shareData.shareUrl)}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {shareData.hasPassword && (
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      密码保护
                    </Badge>
                  )}
                  {shareData.expiresAt && (
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(shareData.expiresAt).toLocaleDateString()} 到期
                    </Badge>
                  )}
                  {shareData.analytics && (
                    <Badge variant="secondary" className="text-xs">
                      <BarChart3 className="w-3 h-3 mr-1" />
                      统计已启用
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(shareData.shareUrl, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                预览
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareData(null)}
                className="flex-1"
              >
                重新生成
              </Button>
            </div>
          </div>
        ) : (
          // 显示分享选项设置
          <div className="space-y-4">
            {/* 密码保护 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">密码保护</Label>
                <Switch
                  checked={usePassword}
                  onCheckedChange={setUsePassword}
                />
              </div>
              {usePassword && (
                <Input
                  type="password"
                  placeholder="设置访问密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </div>

            {/* 过期时间 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">链接有效期</Label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="never">永不过期</option>
                <option value="1hour">1小时后</option>
                <option value="1day">1天后</option>
                <option value="7days">7天后</option>
                <option value="30days">30天后</option>
              </select>
            </div>

            {/* 访问统计 */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">访问统计</Label>
                <p className="text-xs text-gray-500">记录访问次数和来源</p>
              </div>
              <Switch
                checked={enableAnalytics}
                onCheckedChange={setEnableAnalytics}
              />
            </div>

            {/* 生成按钮 */}
            <Button
              onClick={generateShareLink}
              disabled={isGenerating || (usePassword && !password.trim())}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  生成中...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  生成分享链接
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 