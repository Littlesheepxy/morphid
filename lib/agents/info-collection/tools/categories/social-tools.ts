/**
 * 社交平台工具分类
 * 专门处理各类社交平台的信息提取
 */

import { ClaudeToolDefinition, ToolCategory } from '../types';

/**
 * LinkedIn信息提取工具
 */
export const LINKEDIN_EXTRACT_TOOL: ClaudeToolDefinition = {
  name: 'extract_linkedin',
  category: ToolCategory.SOCIAL,
  priority: 9,
  description: `LinkedIn专业档案信息提取工具。专门用于从LinkedIn个人资料链接中提取职业相关信息，构建完整的职业档案。

⚠️ 重要合规声明：
由于LinkedIn的服务条款限制和反爬虫机制，此工具当前采用以下合规方式：
1. 返回标准化的模拟数据结构，供用户参考和手动填充
2. 支持用户手动导出的LinkedIn数据文件处理
3. 支持LinkedIn官方PDF导出功能生成的简历文件
4. 提供LinkedIn数据导入的最佳实践指导

提取信息结构：
- 基本资料：姓名、职位、当前公司、工作地点、个人简介
- 职业摘要：个人品牌描述、职业亮点、价值主张
- 工作经历：详细的职位历史、公司信息、时间段、职责描述、主要成就
- 教育背景：学校名称、学位、专业、毕业年份、学术成就
- 核心技能：专业技能列表、技能认可数、相关证书
- 推荐信息：同事和客户的推荐内容、推荐人信息
- 成就与奖项：专业认证、获奖记录、发表文章
- 语言能力：掌握的语言和熟练程度

数据完整性保障：
- 提供详细的数据结构模板
- 支持增量数据补充和更新
- 数据格式标准化，便于系统集成
- 质量评分和完整度检查

用户友好功能：
- 提供LinkedIn数据导出操作指导
- 支持多种数据格式导入（JSON、CSV、PDF）
- 智能数据映射和字段匹配
- 数据验证和一致性检查

合规处理策略：
- 严格遵守LinkedIn服务条款和隐私政策
- 不进行未授权的数据抓取或API调用
- 提供合法的替代数据获取方案
- 用户数据安全和隐私保护`,
  input_schema: {
    type: 'object',
    properties: {
      profile_url: {
        type: 'string',
        description: 'LinkedIn个人资料页面的完整URL，格式如：https://linkedin.com/in/username。主要用于验证格式和提供数据结构模板'
      },
      data_source: {
        type: 'string',
        enum: ['url_reference', 'exported_data', 'pdf_resume', 'manual_input'],
        description: '数据来源类型。url_reference：仅作为参考；exported_data：用户导出的数据；pdf_resume：LinkedIn生成的PDF；manual_input：手动输入'
      },
      data_file: {
        type: 'string',
        description: '用户提供的LinkedIn导出数据文件（JSON/CSV格式）或PDF简历的base64编码'
      }
    },
    required: ['profile_url']
  },
  metadata: {
    version: '2.0.0',
    author: 'HeysMe Team',
    tags: ['linkedin', 'professional-profile', 'career', 'compliance'],
    estimatedTime: 5000 // 5秒预估时间（主要是模板生成）
  }
};

/**
 * 通用社交媒体分析工具
 */
export const SOCIAL_MEDIA_TOOL: ClaudeToolDefinition = {
  name: 'analyze_social_media',
  category: ToolCategory.SOCIAL,
  priority: 7,
  description: `通用社交媒体平台分析工具。用于从各类社交平台和专业网站中提取用户的专业形象和影响力信息。

支持的平台：
- 专业平台：Behance, Dribbble, CodePen, Dev.to
- 内容平台：Medium, YouTube, Bilibili, 知乎
- 代码平台：GitHub Pages, GitLab, Gitee
- 设计平台：Figma Community, Adobe Portfolio

分析维度：
- 平台活跃度和参与度
- 内容质量和专业水准
- 影响力指标（粉丝、点赞、分享）
- 专业领域和技能展示
- 网络形象一致性

提取信息：
- 基本档案信息
- 发布内容统计
- 互动数据分析
- 专业技能标签
- 影响力评估`,
  input_schema: {
    type: 'object',
    properties: {
      platform_url: {
        type: 'string',
        description: '社交媒体平台的个人主页URL'
      },
      platform_type: {
        type: 'string',
        enum: ['behance', 'dribbble', 'medium', 'youtube', 'codepen', 'devto'],
        description: '平台类型，用于选择合适的分析策略'
      },
      analysis_focus: {
        type: 'string',
        enum: ['profile', 'content', 'influence', 'skills'],
        description: '分析重点。profile：基本信息；content：内容分析；influence：影响力；skills：技能展示'
      }
    },
    required: ['platform_url']
  },
  metadata: {
    version: '1.5.0',
    author: 'HeysMe Team',
    tags: ['social-media', 'influence', 'content-analysis'],
    estimatedTime: 8000
  }
};

/**
 * 社交网络整合工具
 */
export const SOCIAL_NETWORK_TOOL: ClaudeToolDefinition = {
  name: 'integrate_social_network',
  category: ToolCategory.SOCIAL,
  priority: 6,
  description: `社交网络整合分析工具。将用户在多个平台的信息整合，形成统一的数字身份档案。

整合功能：
- 跨平台身份验证和关联
- 信息一致性检查和冲突解决
- 综合影响力评估
- 专业形象分析
- 网络声誉评估

输出结果：
- 统一的数字身份档案
- 跨平台影响力评分
- 专业形象一致性报告
- 优化建议和改进方案`,
  input_schema: {
    type: 'object',
    properties: {
      platform_profiles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            platform: { type: 'string' },
            url: { type: 'string' },
            data: { type: 'object' }
          }
        },
        description: '多个平台的档案信息数组'
      },
      primary_platform: {
        type: 'string',
        description: '主要平台，用作身份验证的基准'
      }
    },
    required: ['platform_profiles']
  },
  metadata: {
    version: '1.0.0',
    author: 'HeysMe Team',
    tags: ['integration', 'digital-identity', 'multi-platform'],
    estimatedTime: 10000
  }
};

/**
 * 社交工具集合
 */
export const SOCIAL_TOOLS: ClaudeToolDefinition[] = [
  LINKEDIN_EXTRACT_TOOL,
  SOCIAL_MEDIA_TOOL,
  SOCIAL_NETWORK_TOOL
];

/**
 * 社交工具相关的辅助函数
 */
export function detectSocialPlatform(url: string): { platform: string; valid: boolean; reason?: string } {
  const platforms = {
    linkedin: /linkedin\.com\/in\//i,
    behance: /behance\.net\//i,
    dribbble: /dribbble\.com\//i,
    github: /github\.com\//i,
    medium: /medium\.com\/@/i,
    twitter: /twitter\.com\//i,
    instagram: /instagram\.com\//i,
    youtube: /youtube\.com\/(c\/|channel\/|@)/i,
    codepen: /codepen\.io\//i,
    devto: /dev\.to\//i
  };
  
  for (const [platform, pattern] of Object.entries(platforms)) {
    if (pattern.test(url)) {
      return { platform, valid: true };
    }
  }
  
  return { platform: 'unknown', valid: false, reason: '不支持的社交平台' };
}

export function validateLinkedInUrl(url: string): { valid: boolean; reason?: string } {
  if (!url) {
    return { valid: false, reason: 'LinkedIn URL不能为空' };
  }
  
  const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?$/;
  if (!linkedinPattern.test(url)) {
    return { 
      valid: false, 
      reason: 'LinkedIn URL格式不正确，应为：https://linkedin.com/in/username' 
    };
  }
  
  return { valid: true };
}

export function extractSocialUsername(url: string, platform: string): string {
  const patterns: Record<string, RegExp> = {
    linkedin: /linkedin\.com\/in\/([^\/\?]+)/i,
    behance: /behance\.net\/([^\/\?]+)/i,
    dribbble: /dribbble\.com\/([^\/\?]+)/i,
    github: /github\.com\/([^\/\?]+)/i,
    medium: /medium\.com\/@([^\/\?]+)/i,
    twitter: /twitter\.com\/([^\/\?]+)/i,
    codepen: /codepen\.io\/([^\/\?]+)/i,
    devto: /dev\.to\/([^\/\?]+)/i
  };
  
  const pattern = patterns[platform];
  if (pattern) {
    const match = url.match(pattern);
    return match ? match[1] : '';
  }
  
  return '';
}

export function getSocialPlatformPriority(userRole: string): Record<string, number> {
  const priorities: Record<string, Record<string, number>> = {
    '开发者': {
      github: 10,
      linkedin: 8,
      devto: 7,
      medium: 6,
      codepen: 6,
      twitter: 5
    },
    '设计师': {
      behance: 10,
      dribbble: 10,
      linkedin: 7,
      instagram: 6,
      medium: 5,
      twitter: 5
    },
    '产品经理': {
      linkedin: 10,
      medium: 8,
      twitter: 6,
      youtube: 5,
      github: 4
    },
    'AI工程师': {
      github: 10,
      linkedin: 8,
      medium: 7,
      twitter: 6,
      youtube: 5
    }
  };
  
  return priorities[userRole] || {
    linkedin: 8,
    github: 6,
    medium: 5,
    twitter: 4
  };
}

export function generateLinkedInDataTemplate(): any {
  return {
    profile: {
      name: '请填写您的姓名',
      title: '请填写您的职位',
      company: '请填写您的公司',
      location: '请填写您的工作地点',
      summary: '请填写您的个人简介'
    },
    experience: [
      {
        title: '职位名称',
        company: '公司名称',
        duration: '工作时间段',
        description: '工作职责和成就'
      }
    ],
    education: [
      {
        school: '学校名称',
        degree: '学位',
        field: '专业',
        year: '毕业年份'
      }
    ],
    skills: ['技能1', '技能2', '技能3'],
    note: '这是一个数据模板，请根据您的LinkedIn资料填写实际信息'
  };
} 