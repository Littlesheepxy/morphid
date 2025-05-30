// 个性化策略实现
export interface PersonalizationStrategy {
  intent_based_collection: Record<string, IntentConfig>;
  identity_specific_questions: Record<string, IdentityConfig>;
  smart_defaults: SmartDefaults;
}

export interface IntentConfig {
  depth: string;
  required_fields: string[];
  optional_fields?: string[];
  collection_rounds?: number;
  use_defaults?: boolean;
  show_examples?: boolean;
  provide_templates?: boolean;
  use_smart_defaults?: boolean;
  fast_track?: boolean;
}

export interface IdentityConfig {
  core_questions: string[];
  style_suggestions: string[];
  focus_areas?: string[];
  recommended_libraries?: string[];
}

export interface SmartDefaults {
  color_scheme: Record<string, string>;
  layout_preference: Record<string, string>;
  content_priority: Record<string, string[]>;
}

export const PERSONALIZATION_STRATEGIES: PersonalizationStrategy = {
  // 根据用户意图调整收集深度
  intent_based_collection: {
    "正式创建，有具体需求": {
      depth: "深度收集",
      required_fields: ["核心技能", "亮点成就", "目标受众", "风格偏好"],
      optional_fields: ["项目详情", "教育背景", "社交链接"],
      collection_rounds: 3
    },
    
    "先体验功能，看看效果": {
      depth: "快速体验",
      required_fields: ["身份类型", "基本技能"],
      optional_fields: ["风格偏好"],
      collection_rounds: 1,
      use_defaults: true
    },
    
    "学习了解，获得灵感": {
      depth: "展示导向",
      required_fields: ["身份类型", "感兴趣领域"],
      show_examples: true,
      provide_templates: true
    },
    
    "紧急需要，尽快完成": {
      depth: "效率优先",
      required_fields: ["核心信息", "联系方式"],
      use_smart_defaults: true,
      fast_track: true
    }
  },
  
  // 身份特定的问题定制
  identity_specific_questions: {
    "UI/UX设计师": {
      core_questions: [
        "你专长哪种设计类型？(UI设计/UX研究/视觉设计/交互设计)",
        "最得意的设计项目是什么？",
        "你的设计理念或方法论是？",
        "使用哪些设计工具？",
        "目标客户或雇主类型？"
      ],
      style_suggestions: [
        "作品集展示型 - 大图展示，视觉冲击",
        "设计思维型 - 过程展示，逻辑清晰", 
        "极简美学型 - 留白艺术，突出品味"
      ],
      focus_areas: ["视觉作品", "设计过程", "用户体验"],
      recommended_libraries: ["lottie-react", "framer-motion", "styled-components"]
    },
    
    "产品经理": {
      core_questions: [
        "负责过什么类型的产品？(B端/C端/平台/工具)",
        "最有成就感的产品成果是？",
        "你的产品方法论是什么？",
        "擅长产品生命周期的哪个阶段？",
        "目标职位级别？(专员/经理/总监)"
      ],
      style_suggestions: [
        "数据驱动型 - 突出数据和成果",
        "用户中心型 - 强调用户价值", 
        "商业导向型 - 体现商业思维"
      ],
      focus_areas: ["产品成果", "数据指标", "用户价值"],
      recommended_libraries: ["chart.js", "react-chartjs-2", "react-hot-toast"]
    },
    
    "前端/后端开发者": {
      core_questions: [
        "主要技术栈是什么？",
        "最有挑战性的项目经历？", 
        "开源贡献或个人项目？",
        "擅长前端/后端/全栈/移动端？",
        "技术成长方向？"
      ],
      style_suggestions: [
        "技术极客型 - 代码和架构展示",
        "项目驱动型 - 突出解决方案",
        "开源贡献型 - 强调社区参与"
      ],
      focus_areas: ["技术项目", "代码质量", "解决方案"],
      recommended_libraries: ["prism-react-renderer", "react-markdown", "react-syntax-highlighter"]
    },

    "AI/数据科学家": {
      core_questions: [
        "主要研究方向是什么？(NLP/CV/推荐系统/强化学习)",
        "最有影响力的项目或论文？",
        "使用哪些主要工具和框架？",
        "数据科学项目的完整流程经验？",
        "未来技术发展方向？"
      ],
      style_suggestions: [
        "学术研究型 - 突出研究深度和方法论",
        "工程应用型 - 强调落地能力和商业价值",
        "开源贡献型 - 展示技术影响力"
      ],
      focus_areas: ["研究成果", "算法项目", "技术深度"],
      recommended_libraries: ["d3", "observable-plot", "react-vis"]
    },

    "创意工作者": {
      core_questions: [
        "主要创意领域是什么？(品牌/内容/视频/文案)",
        "最有创意的项目案例？",
        "创意灵感来源和工作方法？",
        "合作过的知名品牌或项目？",
        "创意作品的传播效果？"
      ],
      style_suggestions: [
        "作品展示型 - 视觉冲击，创意突出",
        "故事叙述型 - 过程展示，情感连接",
        "品牌个性型 - 突出个人风格和特色"
      ],
      focus_areas: ["创意作品", "品牌案例", "创作过程"],
      recommended_libraries: ["lottie-react", "framer-motion", "react-spring"]
    },

    "学生/求职者": {
      core_questions: [
        "目标行业和职位是什么？",
        "最有价值的学习或实习经历？",
        "掌握的核心技能和工具？",
        "参与过的项目或竞赛？",
        "职业发展规划和目标？"
      ],
      style_suggestions: [
        "成长轨迹型 - 突出学习能力和进步",
        "潜力展示型 - 强调可塑性和热情",
        "专业导向型 - 对标目标职位要求"
      ],
      focus_areas: ["学习经历", "项目经验", "成长潜力"],
      recommended_libraries: ["framer-motion", "react-hot-toast", "lucide-react"]
    }
  },
  
  // 智能默认值生成
  smart_defaults: {
    color_scheme: {
      "UI/UX设计师": "个性渐变",
      "产品经理": "科技蓝", 
      "前端/后端开发者": "优雅灰",
      "AI/数据科学家": "科技蓝",
      "创意工作者": "活力橙",
      "学生/求职者": "自然绿"
    },
    
    layout_preference: {
      "UI/UX设计师": "作品集式",
      "产品经理": "分块卡片式",
      "前端/后端开发者": "极简名片式", 
      "AI/数据科学家": "时间线式",
      "创意工作者": "单页滚动式",
      "学生/求职者": "时间线式"
    },
    
    content_priority: {
      "UI/UX设计师": ["项目作品展示", "设计理念", "核心技能"],
      "产品经理": ["数据成果和亮点", "项目经验", "产品思维"],
      "前端/后端开发者": ["技术项目", "代码能力", "技术栈"],
      "AI/数据科学家": ["研究成果", "算法项目", "学术背景"],
      "创意工作者": ["创意作品", "品牌案例", "创作理念"],
      "学生/求职者": ["学习经历", "项目经验", "职业目标"]
    }
  }
};

// 技能选项生成函数
export const SKILL_OPTIONS_BY_IDENTITY = {
  "UI/UX设计师": [
    "Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", 
    "Principle", "Framer", "用户研究", "交互设计", "视觉设计",
    "原型设计", "设计系统", "可用性测试", "信息架构"
  ],
  
  "产品经理": [
    "产品策略", "用户需求分析", "数据分析", "A/B测试", "PRD撰写",
    "项目管理", "Axure", "墨刀", "SQL", "Python", "敏捷开发", 
    "用户访谈", "竞品分析", "商业分析", "增长策略"
  ],
  
  "前端/后端开发者": [
    "JavaScript", "TypeScript", "React", "Vue", "NextJS", "Node.js",
    "Python", "Java", "Go", "Docker", "Kubernetes", "AWS", "Git",
    "数据库设计", "API设计", "微服务", "性能优化", "DevOps"
  ],
  
  "AI/数据科学家": [
    "Python", "TensorFlow", "PyTorch", "scikit-learn", "Pandas", 
    "机器学习", "深度学习", "NLP", "计算机视觉", "数据挖掘",
    "统计分析", "A/B测试", "SQL", "大数据", "云计算", "MLOps"
  ],
  
  "创意工作者": [
    "创意策划", "文案写作", "视频制作", "摄影", "插画", "品牌设计",
    "After Effects", "Premiere", "Cinema 4D", "内容运营", 
    "社交媒体", "项目执行", "创意思维", "跨媒体创作"
  ],
  
  "学生/求职者": [
    "学术研究", "论文写作", "实习经历", "项目经验", "团队协作",
    "学习能力", "沟通能力", "问题解决", "时间管理", "英语能力",
    "编程基础", "数据分析", "创新思维", "领导力"
  ]
};

// 根据身份和意图生成个性化提示
export function generatePersonalizedPrompt(
  identity: string, 
  intent: string,
  currentInfo?: any
): any {
  const intentConfig = PERSONALIZATION_STRATEGIES.intent_based_collection[intent];
  const identityConfig = PERSONALIZATION_STRATEGIES.identity_specific_questions[identity];
  const defaults = PERSONALIZATION_STRATEGIES.smart_defaults;
  
  if (!intentConfig || !identityConfig) {
    throw new Error(`Unsupported identity: ${identity} or intent: ${intent}`);
  }
  
  return {
    collection_depth: intentConfig.depth,
    required_fields: intentConfig.required_fields,
    skills_options: (SKILL_OPTIONS_BY_IDENTITY as Record<string, string[]>)[identity] || [],
    style_suggestions: identityConfig.style_suggestions,
    smart_defaults: {
      color_scheme: defaults.color_scheme[identity],
      layout: defaults.layout_preference[identity],
      content_priority: defaults.content_priority[identity]
    },
    fast_track: intentConfig.fast_track || false,
    show_examples: intentConfig.show_examples || false
  };
}

// 计算信息完整度
export function calculateCompleteness(userInfo: any, identity: string): number {
  const requiredFields = ["bio", "skills", "user_goal", "user_type"];
  const identitySpecificFields: Record<string, string[]> = {
    "UI/UX设计师": ["portfolio_links", "design_tools"],
    "产品经理": ["product_experience", "data_achievements"],
    "前端/后端开发者": ["github_profile", "tech_stack"],
    "AI/数据科学家": ["research_papers", "technical_projects"],
    "创意工作者": ["creative_portfolio", "brand_projects"],
    "学生/求职者": ["education", "career_goals"]
  };
  
  let score = 0;
  let totalWeight = 0;
  
  // 必填字段权重
  requiredFields.forEach((field: string) => {
    totalWeight += 70;
    if (userInfo[field] && userInfo[field].length > 0) {
      score += 70;
    }
  });
  
  // 身份特定字段权重
  const specificFields = identitySpecificFields[identity] || [];
  specificFields.forEach((field: string) => {
    totalWeight += 30;
    if (userInfo[field] && userInfo[field].length > 0) {
      score += 30;
    }
  });
  
  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
} 