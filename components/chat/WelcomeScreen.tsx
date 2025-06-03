'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Paperclip } from 'lucide-react';

// 动态文本样式
const dynamicTextStyles = `
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    25% { background-position: 100% 50%; }
    50% { background-position: 100% 100%; }
    75% { background-position: 0% 100%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes glow {
    0%, 100% { 
      filter: brightness(1) drop-shadow(0 0 2px rgba(59, 130, 246, 0.3));
    }
    50% { 
      filter: brightness(1.2) drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
    }
  }
  
  @keyframes breathe {
    0%, 100% { 
      transform: scale(1);
      opacity: 0.8;
    }
    50% { 
      transform: scale(1.05);
      opacity: 1;
    }
  }
  
  .animate-glow {
    animation: glow 3s ease-in-out infinite;
  }
  
  .animate-breathe {
    animation: breathe 4s ease-in-out infinite;
  }
`;

interface WelcomeScreenProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
  isGenerating?: boolean;
}

// 淡入淡出切换Hook
const useFadeTransition = (wordSets: string[][], interval: number = 3000) => {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSetIndex(prev => (prev + 1) % wordSets[0].length);
    }, interval);

    return () => clearInterval(timer);
  }, [wordSets, interval]);

  return wordSets.map(set => set[currentSetIndex]);
};

// 优雅的动态文本组件
const AnimatedText = ({ 
  text, 
  className = "", 
  gradientClass = "",
  index = 0
}: { 
  text: string,
  className?: string, 
  gradientClass?: string,
  index?: number
}) => {
  return (
    <span className="inline-block relative">
      <AnimatePresence mode="wait">
        <motion.span
          key={text}
          initial={{ 
            opacity: 0, 
            scale: 0.7
          }}
          animate={{ 
            opacity: 1, 
            scale: 1
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.7
          }}
          transition={{ 
            duration: 0.5,
            delay: index * 0.08, // 稍微错开动画时间
            ease: [0.25, 0.25, 0, 1] // 更优雅的缓动函数
          }}
          className={`
            ${className} 
            ${gradientClass} 
            bg-clip-text text-transparent font-bold
            inline-block
            transition-all duration-300
            animate-glow
          `}
          style={{
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 4s ease-in-out infinite'
          }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export function WelcomeScreen({ inputValue, setInputValue, onSendMessage, isGenerating }: WelcomeScreenProps) {
  // 动态文本配置 - 每组对应的词汇
  const wordSets = [
    ["求职", "合作", "招聘", "分享", "求职","商务"],           // 第一组：目的
    ["个人简历", "主页","团队及项目", "博客","作品集","团队及项目"],      // 第二组：内容类型
    ["HR", "客户", "候选人","粉丝", "合作方","HR","客户"]            // 第三组：受众
  ];

  const currentTexts = useFadeTransition(wordSets, 3500); // 3.5秒切换一次

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
      
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* 欢迎文本 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <motion.div 
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-breathe"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              HeysMe AI
            </h1>
            
            <div className="text-xl text-gray-600 h-16 flex items-center justify-center">
              <div className="text-center leading-relaxed px-4 flex flex-wrap items-center justify-center gap-1">
                <span>你好！我是 HeysMe AI 助手，我可以快速帮助你创建用于</span>
                <AnimatedText
                  text={currentTexts[0]}
                  gradientClass="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:200%_200%]"
                  className="mx-1 px-3 py-1 rounded-lg"
                  index={0}
                />
                <span>目的的</span>
                <AnimatedText
                  text={currentTexts[1]}
                  gradientClass="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-[length:200%_200%]"
                  className="mx-1 px-3 py-1 rounded-lg"
                  index={1}
                />
                <span>，展示给你的</span>
                <AnimatedText
                  text={currentTexts[2]}
                  gradientClass="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-[length:200%_200%]"
                  className="mx-1 px-3 py-1 rounded-lg"
                  index={2}
                />
                <span>！</span>
              </div>
            </div>
          </motion.div>

          {/* 输入框 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full"
          >
            <div className="relative">
              <div className="flex items-end gap-3 p-4 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-gray-400 hover:text-gray-600"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="告诉我你想要什么样的简历..."
                    className="border-0 p-0 text-lg placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                  />
                </div>

                <Button
                  onClick={onSendMessage}
                  disabled={!inputValue.trim() || isGenerating}
                  size="sm"
                  className="w-8 h-8 p-0 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 示例提示 */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
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
                  transition={{ delay: 0.8 + index * 0.1 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInputValue(example)}
                    className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full border border-gray-200 transition-all duration-300 hover:border-blue-300 hover:shadow-md"
                  >
                    {example}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
} 