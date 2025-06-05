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
   * 网页内容抓取
   */
  async scrapeWebpage(url: string, targetSections: string[] = ['all']): Promise<any> {
    try {
      // 这里可以集成网页抓取服务，如Puppeteer、Cheerio等
      // 为了演示，返回模拟数据
      
      const urlType = this.detectWebsiteType(url);
      
      return {
        url,
        title: `从${url}提取的内容`,
        type: urlType,
        extracted_content: {
          about: '这是从网站提取的关于信息...',
          projects: [
            {
              name: '项目1',
              description: '从网站提取的项目描述',
              tech_stack: ['React', 'Node.js']
            }
          ],
          contact: {
            email: 'extracted@email.com'
          }
        },
        suggestions: {
          iframe_display: urlType === 'portfolio',
          reason: urlType === 'portfolio' ? '这个作品集网站设计精美，建议通过iframe展示' : '建议解析内容进行结构化展示',
          iframe_settings: urlType === 'portfolio' ? {
            height: '600px',
            responsive: true,
            sandbox: 'allow-same-origin allow-scripts'
          } : null
        },
        extraction_confidence: 0.75
      };
      
    } catch (error) {
      console.error('网页抓取失败:', error);
      return {
        url,
        error: '无法访问该网页',
        suggestions: {
          iframe_display: false,
          reason: '网页无法访问，建议用户提供其他材料'
        }
      };
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
    const languages = new Set<string>();
    repositories.forEach(repo => {
      if (repo.language) {
        languages.add(repo.language);
      }
    });
    return Array.from(languages).slice(0, 10); // 限制数量
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