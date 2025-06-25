import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 🔧 全局内容清理函数：彻底清理文本中的多余空行和空格
 * 用于统一处理AI输出、用户输入和渲染内容中的空行问题
 */
export function cleanTextContent(content: string): string {
  if (!content) return '';
  
  return content
    // 1. 移除开头和结尾的空白
    .trim()
    // 2. 标准化换行符
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 3. 移除连续的空行，只保留一个
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    // 4. 移除行尾空格和制表符
    .replace(/[ \t]+$/gm, '')
    // 5. 移除多余的空格（连续空格变为单个）
    .replace(/[ \t]+/g, ' ')
    // 6. 确保列表项之间没有多余空行
    .replace(/(\n[•\-\*]\s[^\n]*)\n\n+(?=[•\-\*]\s)/g, '$1\n')
    // 7. 确保段落与列表之间只有一个空行
    .replace(/(\n\n+)([•\-\*]\s)/g, '\n\n$2')
    // 8. 移除列表结束后的多余空行
    .replace(/([•\-\*]\s[^\n]*\n)\n+(\n[^•\-\*])/g, '$1\n$2')
    // 9. 处理markdown标记后的空行
    .replace(/(\n#+\s[^\n]*)\n\n+/g, '$1\n\n')
    // 10. 移除问号后的多余空行
    .replace(/(\?\s*)\n\n+/g, '$1\n\n')
    // 11. 移除句号后的多余空行
    .replace(/(\.)\n\n+(?=[A-Z\u4e00-\u9fa5])/g, '$1\n\n')
    // 12. 移除冒号后的多余空行
    .replace(/([:：])\n\n+/g, '$1\n\n')
    // 13. 最终清理：确保开头结尾没有空行
    .trim();
}

/**
 * 🔧 轻量级内容清理函数：仅处理基本的空行问题
 * 用于不需要深度处理的场景
 */
export function cleanBasicContent(content: string): string {
  if (!content) return '';
  
  return content
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}
