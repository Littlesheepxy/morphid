/**
 * 工具服务 - 提供统一的服务聚合和智能路由
 * 精简版：保留核心聚合功能，移除已被专门服务覆盖的功能
 */

import { githubService } from './github-service';
import { webService } from './web-service';
import { documentService } from './document-service';
import { socialService } from './social-service';

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
   * GitHub分析 - 聚合接口
   */
  async analyzeGitHub(usernameOrUrl: string, includeRepos: boolean = true): Promise<any> {
    try {
      console.log(`🐙 [GitHub分析] ${usernameOrUrl} | 包含仓库: ${includeRepos}`);
      
      const result = await githubService.analyzeUser(usernameOrUrl, includeRepos);
      
      // 保持向后兼容的数据格式
      return {
        platform: result.platform,
        username: result.username,
        profile: result.profile,
        top_repositories: result.repositories.slice(0, 10),
        languages: result.languages.summary.map(([lang]: [string, any]) => lang),
        contribution_stats: {
          total_repos: result.profile.public_repos,
          followers: result.profile.followers,
          activity_score: result.activity_metrics.activity_score
        },
        analysis: result.analysis,
        extraction_confidence: result.extraction_confidence,
        metadata: result.metadata
      };
      
    } catch (error) {
      console.error('GitHub分析失败:', error);
      return this.createMockGitHubData(usernameOrUrl);
    }
  }

  /**
   * 网页抓取 - 聚合接口
   */
  async scrapeWebpage(url: string, targetSections: string[] = ['all']): Promise<any> {
    try {
      console.log(`🌐 [网页抓取] ${url} | 目标区域: ${targetSections.join(', ')}`);
      
      const result = await webService.scrapeWebpage(url, targetSections);
      
      // 保持向后兼容的数据格式
      return {
        url: result.url,
        title: result.title,
        type: result.type,
        content_analysis: {
          is_accessible: true,
          has_valuable_content: result.content_analysis.has_valuable_content,
          content_quality: result.content_analysis.content_quality,
          technical_stack: result.content_analysis.technical_stack,
          social_links: result.content_analysis.social_links
        },
        extracted_content: result.extracted_content,
        suggestions: result.suggestions,
        extraction_confidence: result.extraction_confidence,
        metadata: result.metadata
      };
      
    } catch (error) {
      console.error('网页抓取失败:', error);
      return this.createWebErrorResponse(url, error);
    }
  }

  /**
   * 文档解析 - 聚合接口
   */
  async parseDocument(fileData: string, fileType: string): Promise<any> {
    try {
      console.log(`📄 [文档解析] 类型: ${fileType}`);
      return await documentService.parseDocument(fileData, fileType);
    } catch (error) {
      console.error('文档解析失败:', error);
      return {
        error: '文档解析失败',
        file_type: fileType,
        extraction_confidence: 0,
        suggestions: {
          manual_processing: true,
          reason: '建议手动输入文档内容'
        }
      };
    }
  }

  /**
   * LinkedIn提取 - 聚合接口（模拟实现）
   */
  async extractLinkedIn(profileUrl: string): Promise<any> {
    try {
      console.log(`💼 [LinkedIn提取] ${profileUrl}`);
      return await socialService.extractLinkedIn(profileUrl);
    } catch (error) {
      console.error('LinkedIn提取失败:', error);
      return this.createMockLinkedInData(profileUrl);
    }
  }

  /**
   * 智能链接处理 - 核心路由功能
   */
  async processIntelligentLink(url: string, userContext?: any): Promise<any> {
    try {
      console.log(`🔗 [智能链接处理] ${url}`);
      
      // 检测链接类型并选择合适的服务
      if (url.includes('github.com')) {
        if (url.split('/').length === 5 && !url.includes('/blob/')) {
          // GitHub仓库
          return await githubService.analyzeRepository(url);
        } else {
          // GitHub用户
          return await githubService.analyzeUser(url, true);
        }
      } else if (url.includes('linkedin.com/in/')) {
        // LinkedIn个人资料
        return await socialService.extractLinkedIn(url);
      } else if (url.includes('dribbble.com') || url.includes('behance.net')) {
        // 设计平台
        return await socialService.analyzeSocialMedia(url, { focus: 'design' });
      } else {
        // 通用网页
        return await webService.scrapeWebpage(url, ['all']);
      }
      
    } catch (error) {
      console.error('智能链接处理失败:', error);
      return {
        url,
        error: '链接处理失败',
        platform: 'unknown',
        extraction_confidence: 0,
        suggestions: {
          manual_processing: true,
          reason: '建议手动描述此链接的内容'
        }
      };
    }
  }

  /**
   * 批量智能链接处理
   */
  async processBatchLinks(urls: string[], userContext?: any): Promise<any[]> {
    console.log(`🔗 [批量链接处理] 处理 ${urls.length} 个链接`);
    
    const results = [];
    for (const url of urls) {
      try {
        const result = await this.processIntelligentLink(url, userContext);
        results.push(result);
      } catch (error) {
        console.error(`链接处理失败: ${url}`, error);
        results.push({
          url,
          error: '处理失败',
          extraction_confidence: 0
        });
      }
    }
    
    return results;
  }

  // ============== 私有辅助方法 ==============

  private extractGitHubUsername(usernameOrUrl: string): string {
    if (usernameOrUrl.includes('github.com')) {
      const matches = usernameOrUrl.match(/github\.com\/([^\/]+)/);
      return matches ? matches[1] : usernameOrUrl;
    }
    return usernameOrUrl;
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
        followers: 50,
        activity_score: 75
      },
      extraction_confidence: 0.3,
      note: '这是模拟数据，实际使用时会调用GitHub API'
    };
  }

  private createMockLinkedInData(profileUrl: string): any {
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
      extraction_confidence: 0.3,
      note: 'LinkedIn数据需要用户授权后才能获取详细信息'
    };
  }

  private createWebErrorResponse(url: string, error: any): any {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      url,
      error: errorMessage,
      content_analysis: {
        is_accessible: false,
        access_issue: 'network_error'
      },
      suggestions: {
        iframe_display: false,
        reason: `网页访问失败: ${errorMessage}`,
        alternative_actions: ['检查URL是否正确', '尝试稍后再次访问', '提供其他链接或材料']
      },
      extraction_confidence: 0,
      metadata: {
        domain: this.extractDomain(url),
        extracted_at: new Date().toISOString(),
        error_occurred: true
      }
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url.split('/')[2] || url;
    }
  }
}

// 导出单例实例
export const toolService = ToolService.getInstance(); 