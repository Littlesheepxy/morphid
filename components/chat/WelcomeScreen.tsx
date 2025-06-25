'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Paperclip } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';

// 🎨 品牌动态文本样式
const dynamicTextStyles = `
  @keyframes brand-gradient-shift {
    0% { background-position: 0% 50%; }
    25% { background-position: 100% 50%; }
    50% { background-position: 100% 100%; }
    75% { background-position: 0% 100%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes brand-glow {
    0%, 100% { 
      filter: brightness(1) drop-shadow(0 0 2px rgba(16, 185, 129, 0.3));
    }
    50% { 
      filter: brightness(1.2) drop-shadow(0 0 8px rgba(16, 185, 129, 0.6));
    }
  }
  
  @keyframes brand-breathe {
    0%, 100% { 
      transform: scale(1);
      opacity: 0.9;
    }
    50% { 
      transform: scale(1.05);
      opacity: 1;
    }
  }
  
  @keyframes cursor-blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  .animate-brand-glow {
    animation: brand-glow 3s ease-in-out infinite;
  }
  
  .animate-brand-breathe {
    animation: brand-breathe 4s ease-in-out infinite;
  }
  
  .cursor-blink {
    animation: cursor-blink 1s infinite;
  }
`;

interface WelcomeScreenProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
  isGenerating?: boolean;
}

// 打字机效果Hook
const useTypewriter = (phrases: string[], baseText: string = "") => {
  const [currentText, setCurrentText] = useState("");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // 打字阶段
        if (currentText.length < currentPhrase.length) {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        } else {
          // 完成打字，等待一会后开始删除
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        // 删除阶段
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          // 删除完成，切换到下一个短语
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, isDeleting ? 50 : 100); // 删除速度比打字速度快

    return () => clearTimeout(timeout);
  }, [currentText, currentPhraseIndex, isDeleting, phrases]);

  return { text: baseText + currentText, showCursor: true };
};

export function WelcomeScreen({ inputValue, setInputValue, onSendMessage, isGenerating }: WelcomeScreenProps) {
  const { theme } = useTheme();

  // 动态文本短语
  const phrases = [
    "用于求职目的的个人简历，展示给你的HR！",
    "用于合作目的的主页，展示给你的客户！", 
    "用于招聘目的的团队及项目，展示给你的候选人！",
    "用于分享目的的博客，展示给你的粉丝！",
    "用于求职目的的作品集，展示给你的合作方！",
    "用于商务目的的团队及项目，展示给你的HR！"
  ];

  const baseText = "你好！我是 HeysMe AI 助手，我可以快速帮助你创建";
  const { text: dynamicText, showCursor } = useTypewriter(phrases, baseText);

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <>
      {/* 注入动态样式 */}
      <style jsx>{dynamicTextStyles}</style>
      
      <div className={`flex-1 flex flex-col items-center justify-center px-6 ${
        theme === "light" ? "bg-white" : "bg-gray-900"
      }`}>
        <div className="w-full max-w-3xl mx-auto text-center">
          {/* 🎨 欢迎文本 - 打字机效果 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* Logo保持品牌色 */}
            <motion.div 
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md"
              style={{
                background: 'linear-gradient(135deg, #34D399 0%, #2DD4BF 50%, #22D3EE 100%)',
              }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            
            <h1 className={`text-3xl font-bold mb-4 ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}>
              HeysMe AI
            </h1>
            
            {/* 打字机效果文本 */}
            <div className={`text-lg min-h-16 flex items-center justify-center ${
              theme === "light" ? "text-gray-600" : "text-gray-300"
            }`}>
              <div className="text-center leading-relaxed px-4">
                <span className="inline-block">
                  {dynamicText.split('').map((char, index) => {
                    // 判断当前字符是否在变化的部分
                    const isInChangingPart = index >= baseText.length;
                    return (
                      <span
                        key={index}
                        className={isInChangingPart ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent font-bold' : ''}
                      >
                        {char}
                      </span>
                    );
                  })}
                  {showCursor && (
                    <span className={`inline-block w-0.5 h-6 ml-1 cursor-blink ${
                      theme === "light" ? "bg-gray-400" : "bg-gray-500"
                    }`}></span>
                  )}
                </span>
              </div>
            </div>
          </motion.div>

          {/* 🎨 输入框 - 简约设计，品牌色仅用于边框 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full"
          >
            {/* 🎨 快捷发送按钮 - 移到输入框上方，一行显示 */}
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {[
                "我想制作求职简历，目标是互联网公司",
                "创建设计师作品集，展示给潜在客户",
                "制作个人主页，分享给社交媒体粉丝",
                "构建专业博客，吸引行业合作伙伴"
              ].map((example, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInputValue(example)}
                    className={`text-sm rounded-xl border transition-all duration-300 hover:scale-105 ${
                      theme === "light"
                        ? "text-gray-700 hover:text-gray-900 bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                        : "text-gray-300 hover:text-gray-100 bg-gray-800 border-gray-700 hover:border-emerald-600 hover:bg-gray-700"
                    }`}
                  >
                    {example}
                  </Button>
                </motion.div>
              ))}
            </div>

            <div className="relative">
              <div 
                className={`flex items-center rounded-3xl transition-all duration-300 border-2 cursor-text ${
                  theme === "light" 
                    ? "bg-white border-emerald-200/80 shadow-sm hover:border-emerald-300/80 hover:shadow-md" 
                    : "bg-gray-800 border-emerald-700/50 shadow-sm hover:border-emerald-600/50 hover:shadow-md"
                }`}
                onClick={() => {
                  const input = document.querySelector('#welcome-input') as HTMLInputElement;
                  input?.focus();
                }}
              >
                {/* 文档上传图标 - 内部左侧 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`ml-3 p-3 h-12 w-12 rounded-2xl transition-all duration-300 flex-shrink-0 ${
                    theme === "light"
                      ? "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                      : "text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  }`}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                {/* 输入框区域 */}
                <div className="flex-1 relative">
                  <Input
                    id="welcome-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="告诉我你想要什么样的简历..."
                    className={`border-0 px-4 py-4 text-base h-18 w-full transition-all duration-300 pr-16 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-3xl ${
                      theme === "light"
                        ? "bg-transparent placeholder:text-gray-400 text-gray-900"
                        : "bg-transparent placeholder:text-gray-500 text-white"
                    }`}
                    style={{ height: '72px' }}
                    autoFocus
                  />
                  
                  {/* 发送按钮 - 内部右侧 */}
                  <Button
                    onClick={onSendMessage}
                    disabled={!inputValue.trim() || isGenerating}
                    size="sm"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-12 h-12 p-0 rounded-2xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 z-20"
                    style={{
                      background: !inputValue.trim() || isGenerating 
                        ? '#9CA3AF' 
                        : 'linear-gradient(135deg, #34D399 0%, #2DD4BF 50%, #22D3EE 100%)',
                    }}
                  >
                    <Send className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </div>
              
              {/* 🎨 输入提示 - 简约设计 */}
              <div className={`flex items-center justify-center mt-4 text-sm ${
                theme === "light" ? "text-gray-500" : "text-gray-400"
              }`}>
                <span>按 Enter 发送消息，开始创建你的专属页面</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
} 