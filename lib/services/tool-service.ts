/**
 * 工具服务 - 提供实际的外部API调用能力
 */

export class ToolService {
  private static instance: ToolService;
  
  private constructor() {}
  
  public static getInstance(): ToolService {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
    }
    return ToolService.instance;
  }

  /**
   * GitHub仓库分析
   */
  async analyzeGitHub(usernameOrUrl: string, includeRepos: boolean = true): Promise<any> {
    try {
      // 提取用户名
      const username = this.extractGitHubUsername(usernameOrUrl);
      
      // 调用GitHub API（这里可以集成实际的GitHub API）
      const profileResponse = await fetch(`https://api.github.com/users/${username}`);
      if (!profileResponse.ok) {
        throw new Error('GitHub用户不存在');
      }
      
      const profile = await profileResponse.json();
      
      let repositories = [];
      if (includeRepos) {
        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=10`);
        if (reposResponse.ok) {
          repositories = await reposResponse.json();
        }
      }

      return {
        platform: 'github',
        username: profile.login,
        profile: {
          name: profile.name || profile.login,
          bio: profile.bio,
          location: profile.location,
          followers: profile.followers,
          following: profile.following,
          public_repos: profile.public_repos,
          avatar_url: profile.avatar_url
        },
        top_repositories: repositories.map((repo: any) => ({
          name: repo.name,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          url: repo.html_url,
          updated_at: repo.updated_at
        })),
        languages: this.extractLanguagesFromRepos(repositories),
        contribution_stats: {
          total_repos: profile.public_repos,
          followers: profile.followers
        }
      };
      
    } catch (error) {
      console.error('GitHub分析失败:', error);
      return this.createMockGitHubData(usernameOrUrl);
    }
  }

  /**
   * 网页内容抓取 - 增强版实现
   */
  async scrapeWebpage(url: string, targetSections: string[] = ['all']): Promise<any> {
    try {
      console.log(`🌐 [网页抓取] ${url} | 目标区域: ${targetSections.join(', ')}`);
      
      // 首先尝试获取页面的基本信息
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const analysisResult = this.analyzeHtmlContent(html, url, targetSections);
      
      return {
        url,
        title: analysisResult.title,
        type: analysisResult.websiteType,
        content_analysis: {
          is_accessible: true,
          has_valuable_content: analysisResult.hasContent,
          content_quality: analysisResult.contentQuality,
          technical_stack: analysisResult.techStack,
          social_links: analysisResult.socialLinks
        },
        extracted_content: analysisResult.extractedContent,
        suggestions: {
          iframe_display: analysisResult.suitableForIframe,
          reason: analysisResult.iframeReason,
          iframe_settings: analysisResult.suitableForIframe ? {
            height: analysisResult.websiteType === 'portfolio' ? '800px' : '600px',
            responsive: true,
            sandbox: 'allow-same-origin allow-scripts allow-forms',
            security_level: 'medium'
          } : null,
          alternative_display: !analysisResult.suitableForIframe ? 'card' : 'iframe',
          content_highlights: analysisResult.highlights
        },
        extraction_confidence: analysisResult.confidence,
        metadata: {
          domain: new URL(url).hostname,
          extracted_at: new Date().toISOString(),
          content_length: html.length,
          analysis_sections: targetSections
        }
      };
      
    } catch (error) {
      console.error('网页抓取失败:', error);
      
      // 增强的错误处理
      const errorType = this.classifyWebpageError(error, url);
      
      return {
        url,
        error: errorType.message,
        error_type: errorType.type,
        content_analysis: {
          is_accessible: false,
          access_issue: errorType.type
        },
        suggestions: {
          iframe_display: false,
          reason: `网页访问失败: ${errorType.message}`,
          alternative_actions: errorType.suggestions
        },
        extraction_confidence: 0,
        metadata: {
          domain: this.extractDomain(url),
          extracted_at: new Date().toISOString(),
          error_occurred: true
        }
      };
    }
  }

  /**
   * 分析HTML内容并提取结构化信息
   */
  private analyzeHtmlContent(html: string, url: string, targetSections: string[]) {
    // 基础元数据提取
    const title = this.extractTitle(html);
    const description = this.extractDescription(html);
    const keywords = this.extractKeywords(html);
    
    // 网站类型检测
    const websiteType = this.detectWebsiteTypeFromContent(html, url);
    
    // 技术栈分析
    const techStack = this.analyzeTechnicalStack(html);
    
    // 社交链接提取
    const socialLinks = this.extractSocialLinks(html);
    
    // 内容结构分析
    const contentStructure = this.analyzeContentStructure(html, targetSections);
    
    // 判断是否适合iframe展示
    const iframeSuitability = this.assessIframeSuitability(html, websiteType, url);
    
    return {
      title: title || '未知页面',
      description,
      keywords,
      websiteType,
      techStack,
      socialLinks,
      extractedContent: contentStructure,
      hasContent: contentStructure.sections.length > 0,
      contentQuality: this.assessContentQuality(contentStructure),
      suitableForIframe: iframeSuitability.suitable,
      iframeReason: iframeSuitability.reason,
      highlights: contentStructure.highlights,
      confidence: this.calculateExtractionConfidence(contentStructure, techStack, socialLinks)
    };
  }

  /**
   * 提取页面标题
   */
  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim().replace(/&[^;]+;/g, ''); // 简单的HTML实体解码
    }
    
    // 回退：查找h1标签
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      return h1Match[1].replace(/<[^>]*>/g, '').trim();
    }
    
    return '';
  }

  /**
   * 提取页面描述
   */
  private extractDescription(html: string): string {
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*?)["']/i);
    if (metaDescMatch) {
      return metaDescMatch[1].trim();
    }
    
    // 回退：查找第一个p标签
    const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
    if (pMatch) {
      const cleanText = pMatch[1].replace(/<[^>]*>/g, '').trim();
      return cleanText.substring(0, 200) + (cleanText.length > 200 ? '...' : '');
    }
    
    return '';
  }

  /**
   * 提取页面关键词
   */
  private extractKeywords(html: string): string[] {
    const metaKeywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*?)["']/i);
    if (metaKeywordsMatch) {
      return metaKeywordsMatch[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    
    // 回退：从标题和描述中提取
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    
    const commonKeywords = ['react', 'vue', 'javascript', 'typescript', 'portfolio', 'developer', 'designer'];
    const foundKeywords: string[] = [];
    
    commonKeywords.forEach(keyword => {
      if (html.toLowerCase().includes(keyword)) {
        foundKeywords.push(keyword);
      }
    });
    
    return foundKeywords;
  }

  /**
   * 分析网站类型
   */
  private detectWebsiteTypeFromContent(html: string, url: string): string {
    const urlType = this.detectWebsiteType(url);
    if (urlType !== 'general') return urlType;
    
    // 基于内容的类型检测
    const content = html.toLowerCase();
    
    if (content.includes('portfolio') || content.includes('作品集') || 
        content.includes('gallery') || content.includes('showcase')) {
      return 'portfolio';
    }
    
    if (content.includes('blog') || content.includes('article') || 
        content.includes('博客') || content.includes('文章')) {
      return 'blog';
    }
    
    if (content.includes('resume') || content.includes('cv') || 
        content.includes('简历') || content.includes('experience')) {
      return 'resume';
    }
    
    if (content.includes('company') || content.includes('business') || 
        content.includes('公司') || content.includes('企业')) {
      return 'company';
    }
    
    return 'personal';
  }

  /**
   * 分析技术栈
   */
  private analyzeTechnicalStack(html: string): string[] {
    const techStackArray: string[] = [];
    const content = html.toLowerCase();
    
    // 前端技术
    const frontendTechs = ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'sass', 'less'];
    for (const tech of frontendTechs) {
      if (content.includes(tech) && !techStackArray.includes(tech)) {
        techStackArray.push(tech);
      }
    }
    
    // 后端技术
    const backendTechs = ['node', 'python', 'java', 'php', 'ruby', 'go', 'rust', 'c++'];
    for (const tech of backendTechs) {
      if (content.includes(tech) && !techStackArray.includes(tech)) {
        techStackArray.push(tech);
      }
    }
    
    // 框架和库
    const frameworks = ['express', 'fastify', 'django', 'flask', 'spring', 'laravel'];
    for (const framework of frameworks) {
      if (content.includes(framework) && !techStackArray.includes(framework)) {
        techStackArray.push(framework);
      }
    }
    
    return techStackArray;
  }

  /**
   * 提取社交链接
   */
  private extractSocialLinks(html: string): Record<string, string> {
    const socialLinks: Record<string, string> = {};
    
    const socialPatterns = {
      github: /href=["'](https?:\/\/github\.com\/[^"']*?)["']/gi,
      linkedin: /href=["'](https?:\/\/linkedin\.com\/[^"']*?)["']/gi,
      twitter: /href=["'](https?:\/\/twitter\.com\/[^"']*?)["']/gi,
      behance: /href=["'](https?:\/\/behance\.net\/[^"']*?)["']/gi,
      dribbble: /href=["'](https?:\/\/dribbble\.com\/[^"']*?)["']/gi
    };
    
    Object.entries(socialPatterns).forEach(([platform, pattern]) => {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        // 取第一个匹配的链接
        const linkMatch = matches[0].match(/https?:\/\/[^"']*/);
        if (linkMatch) {
          socialLinks[platform] = linkMatch[0];
        }
      }
    });
    
    return socialLinks;
  }

  /**
   * 分析内容结构
   */
  private analyzeContentStructure(html: string, targetSections: string[]) {
    const sections: any[] = [];
    const highlights: string[] = [];
    
    // 如果要求所有内容
    if (targetSections.includes('all')) {
      targetSections = ['about', 'projects', 'experience', 'skills', 'contact'];
    }
    
    targetSections.forEach(section => {
      const sectionContent = this.extractSectionContent(html, section);
      if (sectionContent) {
        sections.push(sectionContent);
        if (sectionContent.highlights) {
          highlights.push(...sectionContent.highlights);
        }
      }
    });
    
    return { sections, highlights };
  }

  /**
   * 提取特定区域内容
   */
  private extractSectionContent(html: string, sectionType: string): any | null {
    // 简化的内容提取逻辑
    const sectionPatterns = {
      about: /(about|关于|介绍)/gi,
      projects: /(project|portfolio|作品|项目)/gi,
      experience: /(experience|work|工作|经历)/gi,
      skills: /(skill|技能|能力)/gi,
      contact: /(contact|联系|邮箱)/gi
    };
    
    const pattern = sectionPatterns[sectionType as keyof typeof sectionPatterns];
    if (!pattern) return null;
    
    // 查找包含关键词的section或div
    const sectionRegex = new RegExp(
      `<(section|div|article)[^>]*>(.*?${pattern.source}.*?)<\/(section|div|article)>`,
      'gis'
    );
    
    const matches = html.match(sectionRegex);
    if (matches && matches.length > 0) {
      const content = matches[0].replace(/<[^>]*>/g, ' ').trim();
      return {
        type: sectionType,
        content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        highlights: this.extractHighlights(content, sectionType)
      };
    }
    
    return null;
  }

  /**
   * 提取亮点信息
   */
  private extractHighlights(content: string, sectionType: string): string[] {
    const highlights: string[] = [];
    
    // 基于区域类型提取不同的亮点
    switch (sectionType) {
      case 'projects':
        // 查找项目相关的技术栈
        const techWords = content.match(/\b(React|Vue|Angular|JavaScript|TypeScript|Python|Java|Node\.js|MongoDB|MySQL|AWS|Docker|Kubernetes)\b/gi);
        if (techWords) {
          highlights.push(`技术栈: ${Array.from(new Set(techWords)).join(', ')}`);
        }
        break;
        
      case 'experience':
        // 查找职位和公司
        const jobTitles = content.match(/\b(Engineer|Developer|Designer|Manager|Lead|Senior|Junior|工程师|开发|设计师|经理)\b/gi);
        if (jobTitles) {
          highlights.push(`职位经验: ${Array.from(new Set(jobTitles)).slice(0, 3).join(', ')}`);
        }
        break;
        
      case 'skills':
        // 查找技能关键词
        const skills = content.match(/\b(JavaScript|Python|React|Vue|Design|Frontend|Backend|UI|UX|API|Database)\b/gi);
        if (skills) {
          highlights.push(`核心技能: ${Array.from(new Set(skills)).slice(0, 5).join(', ')}`);
        }
        break;
    }
    
    return highlights;
  }

  /**
   * 评估iframe适用性
   */
  private assessIframeSuitability(html: string, websiteType: string, url: string): { suitable: boolean; reason: string } {
    // 安全性检查
    if (html.includes('x-frame-options') || html.includes('frame-ancestors')) {
      return { suitable: false, reason: '网站设置了防嵌入限制' };
    }
    
    // 根据网站类型判断
    const iframeFriendlyTypes = ['portfolio', 'personal', 'blog'];
    if (iframeFriendlyTypes.includes(websiteType)) {
      return { suitable: true, reason: `${websiteType}类型网站适合iframe展示，可以提供完整的视觉体验` };
    }
    
    // 检查是否是个人域名
    const domain = new URL(url).hostname;
    if (this.isPersonalDomain(domain)) {
      return { suitable: true, reason: '个人网站适合iframe展示' };
    }
    
    return { suitable: false, reason: '建议提取关键内容进行结构化展示' };
  }

  private isPersonalDomain(domain: string): boolean {
    // 个人域名特征
    const personalIndicators = [
      /^[a-z]+\.(me|dev|io)$/,  // 短域名
      /portfolio/,               // 包含portfolio
      /blog/,                   // 包含blog
      /^[a-z]+-[a-z]+\./       // 连字符格式
    ];
    
    return personalIndicators.some(pattern => pattern.test(domain));
  }

  /**
   * 评估内容质量
   */
  private assessContentQuality(contentStructure: any): number {
    const { sections } = contentStructure;
    
    if (sections.length === 0) return 0;
    if (sections.length >= 3) return 0.9;
    if (sections.length >= 2) return 0.7;
    return 0.5;
  }

  /**
   * 计算提取置信度
   */
  private calculateExtractionConfidence(contentStructure: any, techStack: string[], socialLinks: Record<string, string>): number {
    let confidence = 0.3; // 基础分
    
    // 内容结构评分
    confidence += Math.min(contentStructure.sections.length * 0.15, 0.4);
    
    // 技术栈评分
    confidence += Math.min(techStack.length * 0.05, 0.2);
    
    // 社交链接评分
    confidence += Math.min(Object.keys(socialLinks).length * 0.05, 0.1);
    
    return Math.min(confidence, 1.0);
  }

  /**
   * 分类网页错误
   */
  private classifyWebpageError(error: any, url: string): { type: string; message: string; suggestions: string[] } {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      return {
        type: 'timeout',
        message: '网页加载超时',
        suggestions: ['尝试稍后再次访问', '检查网络连接', '联系网站管理员']
      };
    }
    
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      return {
        type: 'not_found',
        message: '页面不存在',
        suggestions: ['检查URL是否正确', '访问网站主页', '寻找替代链接']
      };
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return {
        type: 'access_denied',
        message: '访问被拒绝',
        suggestions: ['网站可能需要登录', '检查是否有访问权限', '尝试使用不同的访问方式']
      };
    }
    
    if (errorMessage.includes('CORS') || errorMessage.includes('MIXED_CONTENT')) {
      return {
        type: 'security_restriction',
        message: '浏览器安全限制',
        suggestions: ['这是正常的安全机制', '建议提供其他材料', '可以尝试截图方式']
      };
    }
    
    return {
      type: 'unknown',
      message: '网络或服务器错误',
      suggestions: ['检查网络连接', '稍后重试', '提供备用链接或材料']
    };
  }

  /**
   * 提取域名
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url.split('/')[2] || url;
    }
  }

  /**
   * 文档解析
   */
  async parseDocument(fileData: string, fileType: string): Promise<any> {
    try {
      // 这里可以集成文档解析服务，如OCR、PDF解析等
      // 为了演示，返回模拟数据
      
      return {
        type: 'resume',
        file_type: fileType,
        extracted_data: {
          personal_info: {
            name: '从文档提取的姓名',
            email: 'extracted@email.com',
            phone: '+1234567890',
            location: '北京市'
          },
          experience: [
            {
              title: '高级软件工程师',
              company: '科技公司',
              period: '2020-至今',
              description: '负责前端开发和架构设计，使用React、TypeScript等技术栈'
            }
          ],
          skills: ['JavaScript', 'React', 'TypeScript', 'Node.js', 'Python'],
          education: [
            {
              degree: '计算机科学学士',
              school: '某大学',
              year: '2020'
            }
          ],
          projects: [
            {
              name: '企业级管理系统',
              description: '使用React开发的企业管理平台',
              tech_stack: ['React', 'Ant Design', 'Node.js']
            }
          ]
        },
        confidence: 0.85,
        suggestions: {
          iframe_display: false,
          reason: '简历内容适合结构化展示，建议解析后格式化显示'
        }
      };
      
    } catch (error) {
      console.error('文档解析失败:', error);
      return {
        type: 'document',
        file_type: fileType,
        error: '文档解析失败',
        suggestions: {
          iframe_display: false,
          reason: '无法解析文档内容，建议用户重新上传或提供其他格式'
        }
      };
    }
  }

  /**
   * LinkedIn信息提取（需要特殊处理，因为LinkedIn有反爬虫机制）
   */
  async extractLinkedIn(profileUrl: string): Promise<any> {
    // LinkedIn API需要特殊授权，这里返回模拟数据
    console.log('LinkedIn提取（模拟）:', profileUrl);
    
    return {
      platform: 'linkedin',
      profile_url: profileUrl,
      profile: {
        name: 'LinkedIn用户',
        title: '软件工程师',
        company: '科技公司',
        location: '北京',
        summary: '专注于前端开发和用户体验设计'
      },
      experience: [
        {
          title: '高级前端工程师',
          company: '科技公司',
          duration: '2020-至今',
          description: '负责产品前端开发和技术架构'
        }
      ],
      education: [
        {
          school: '北京大学',
          degree: '计算机科学硕士',
          field: '计算机科学',
          year: '2020'
        }
      ],
      skills: ['JavaScript', 'React', 'Vue.js', 'TypeScript'],
      note: 'LinkedIn数据需要用户授权后才能获取详细信息'
    };
  }

  // ============== 辅助方法 ==============

  private extractGitHubUsername(usernameOrUrl: string): string {
    if (usernameOrUrl.includes('github.com')) {
      const matches = usernameOrUrl.match(/github\.com\/([^\/]+)/);
      return matches ? matches[1] : usernameOrUrl;
    }
    return usernameOrUrl;
  }

  private extractLanguagesFromRepos(repositories: any[]): string[] {
    const languagesArray: string[] = [];
    for (const repo of repositories) {
      if (repo.language && !languagesArray.includes(repo.language)) {
        languagesArray.push(repo.language);
      }
    }
    return languagesArray.slice(0, 10); // 限制数量
  }

  private detectWebsiteType(url: string): string {
    if (url.includes('behance.net') || url.includes('dribbble.com')) return 'portfolio';
    if (url.includes('medium.com') || url.includes('blog')) return 'blog';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('github.com')) return 'github';
    return 'general';
  }

  private createMockGitHubData(usernameOrUrl: string): any {
    const username = this.extractGitHubUsername(usernameOrUrl);
    
    return {
      platform: 'github',
      username,
      profile: {
        name: `GitHub用户-${username}`,
        bio: '热爱编程的开发者',
        location: '北京',
        followers: 50,
        following: 30,
        public_repos: 15
      },
      top_repositories: [
        {
          name: 'awesome-project',
          description: '一个很棒的开源项目',
          language: 'JavaScript',
          stars: 100,
          forks: 20,
          url: `https://github.com/${username}/awesome-project`
        }
      ],
      languages: ['JavaScript', 'TypeScript', 'Python'],
      contribution_stats: {
        total_repos: 15,
        followers: 50
      },
      note: '这是模拟数据，实际使用时会调用GitHub API'
    };
  }
}

// 导出单例实例
export const toolService = ToolService.getInstance(); 