/**
 * 社交平台服务 - 专门处理各类社交平台的信息提取
 */

import { webService } from './web-service';

export class SocialService {

  /**
   * LinkedIn信息提取（合规版）
   */
  async extractLinkedIn(profileUrl: string, options: any = {}): Promise<any> {
    try {
      console.log(`💼 [LinkedIn提取] URL: ${profileUrl}`);

      // 验证LinkedIn URL格式
      const validation = this.validateLinkedInUrl(profileUrl);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }

      const dataSource = options.data_source || 'url_reference';

      switch (dataSource) {
        case 'exported_data':
          return await this.processExportedData(options.data_file);
        case 'pdf_resume':
          return await this.processPDFResume(options.data_file);
        case 'manual_input':
          return this.createLinkedInTemplate(profileUrl);
        default:
          return this.createLinkedInTemplate(profileUrl);
      }

    } catch (error: any) {
      console.error('LinkedIn提取失败:', error);
      return this.createLinkedInErrorResponse(profileUrl, error.message);
    }
  }

  /**
   * 通用社交媒体分析
   */
  async analyzeSocialMedia(platformUrl: string, options: any = {}): Promise<any> {
    try {
      const platform = this.detectSocialPlatform(platformUrl);
      const analysisFocus = options.analysis_focus || 'profile';

      console.log(`📱 [社交媒体分析] 平台: ${platform.platform} | 焦点: ${analysisFocus}`);

      if (!platform.valid) {
        throw new Error(platform.reason || '不支持的社交平台');
      }

      // 根据平台类型选择不同的分析策略
      switch (platform.platform) {
        case 'behance':
        case 'dribbble':
          return await this.analyzeDesignPlatform(platformUrl, platform.platform, analysisFocus);
        case 'medium':
        case 'devto':
          return await this.analyzeContentPlatform(platformUrl, platform.platform, analysisFocus);
        case 'github':
          return await this.analyzeCodePlatform(platformUrl, analysisFocus);
        case 'youtube':
          return await this.analyzeVideoPlatform(platformUrl, analysisFocus);
        default:
          return await this.analyzeGenericPlatform(platformUrl, platform.platform, analysisFocus);
      }

    } catch (error: any) {
      return {
        platform_url: platformUrl,
        error: error.message,
        platform_type: 'unknown',
        analysis_focus: options.analysis_focus,
        extraction_confidence: 0,
        metadata: {
          extracted_at: new Date().toISOString(),
          error_occurred: true,
        }
      };
    }
  }

  /**
   * 社交网络整合分析
   */
  async integrateSocialNetwork(platformProfiles: any[], options: any = {}): Promise<any> {
    try {
      console.log(`🔗 [社交网络整合] 分析 ${platformProfiles.length} 个平台`);

      const primaryPlatform = options.primary_platform || platformProfiles[0]?.platform;
      
      // 分析每个平台的数据
      const analyzedProfiles = await Promise.all(
        platformProfiles.map(async (profile) => {
          if (profile.data) {
            return { ...profile, analyzed: true };
          } else {
            // 尝试分析平台URL
            const analysis = await this.analyzeSocialMedia(profile.url, { analysis_focus: 'profile' });
            return { ...profile, data: analysis, analyzed: true };
          }
        })
      );

      // 统一数字身份档案
      const unifiedProfile = this.createUnifiedProfile(analyzedProfiles, primaryPlatform);
      
      // 跨平台影响力评估
      const influenceMetrics = this.calculateCrossPlatformInfluence(analyzedProfiles);
      
      // 一致性分析
      const consistencyReport = this.analyzeProfileConsistency(analyzedProfiles);

      return {
        unified_profile: unifiedProfile,
        platform_analysis: analyzedProfiles,
        influence_metrics: influenceMetrics,
        consistency_report: consistencyReport,
        recommendations: this.generateIntegrationRecommendations(consistencyReport, influenceMetrics),
        extraction_confidence: this.calculateIntegrationConfidence(analyzedProfiles),
        metadata: {
          extracted_at: new Date().toISOString(),
          platforms_analyzed: analyzedProfiles.length,
          primary_platform: primaryPlatform,
          analysis_type: 'social_network_integration',
        }
      };

    } catch (error: any) {
      return {
        error: error.message,
        platform_profiles: platformProfiles,
        extraction_confidence: 0,
        metadata: {
          extracted_at: new Date().toISOString(),
          error_occurred: true,
        }
      };
    }
  }

  // =============== 私有分析方法 ===============

  private async analyzeDesignPlatform(url: string, platform: string, focus: string): Promise<any> {
    // 设计平台分析（Behance, Dribbble）
    const webAnalysis = await webService.scrapeWebpage(url, ['projects', 'about']);
    
    return {
      platform_url: url,
      platform_type: platform,
      analysis_focus: focus,
      profile: {
        type: 'designer',
        specialization: this.extractDesignSpecialization(webAnalysis),
        portfolio_quality: this.assessPortfolioQuality(webAnalysis),
      },
      content_analysis: {
        project_count: this.estimateProjectCount(webAnalysis),
        style_consistency: this.analyzeStyleConsistency(webAnalysis),
        technical_skills: this.extractDesignSkills(webAnalysis),
      },
      influence_metrics: {
        followers: this.extractFollowerCount(webAnalysis),
        likes: this.extractLikeCount(webAnalysis),
        views: this.extractViewCount(webAnalysis),
        engagement_rate: this.calculateEngagementRate(webAnalysis),
      },
      extraction_confidence: webAnalysis.extraction_confidence || 0.7,
      metadata: {
        extracted_at: new Date().toISOString(),
        data_source: 'web_scraping',
      }
    };
  }

  private async analyzeContentPlatform(url: string, platform: string, focus: string): Promise<any> {
    // 内容平台分析（Medium, Dev.to）
    const webAnalysis = await webService.scrapeWebpage(url, ['about', 'skills']);
    
    return {
      platform_url: url,
      platform_type: platform,
      analysis_focus: focus,
      profile: {
        type: 'content_creator',
        writing_style: this.analyzeWritingStyle(webAnalysis),
        expertise_areas: this.extractExpertiseFromContent(webAnalysis),
      },
      content_analysis: {
        article_count: this.estimateArticleCount(webAnalysis),
        topics: this.extractContentTopics(webAnalysis),
        writing_quality: this.assessWritingQuality(webAnalysis),
      },
      influence_metrics: {
        followers: this.extractFollowerCount(webAnalysis),
        claps: this.extractClapCount(webAnalysis),
        reading_time: this.estimateReadingTime(webAnalysis),
      },
      extraction_confidence: webAnalysis.extraction_confidence || 0.6,
      metadata: {
        extracted_at: new Date().toISOString(),
        data_source: 'web_scraping',
      }
    };
  }

  private async analyzeCodePlatform(url: string, focus: string): Promise<any> {
    // 代码平台分析（GitHub已在github-service中处理）
    return {
      platform_url: url,
      platform_type: 'github',
      analysis_focus: focus,
      note: '请使用GitHub专用分析工具获取详细信息',
      suggestion: '调用 githubService.analyzeUser() 方法',
      extraction_confidence: 0.9,
    };
  }

  private async analyzeVideoPlatform(url: string, focus: string): Promise<any> {
    // 视频平台分析（YouTube等）
    const webAnalysis = await webService.scrapeWebpage(url, ['about']);
    
    return {
      platform_url: url,
      platform_type: 'youtube',
      analysis_focus: focus,
      profile: {
        type: 'content_creator',
        channel_theme: this.extractChannelTheme(webAnalysis),
        video_style: this.analyzeVideoStyle(webAnalysis),
      },
      content_analysis: {
        video_count: this.estimateVideoCount(webAnalysis),
        subscriber_count: this.extractSubscriberCount(webAnalysis),
        view_count: this.extractTotalViews(webAnalysis),
      },
      extraction_confidence: webAnalysis.extraction_confidence || 0.5,
      metadata: {
        extracted_at: new Date().toISOString(),
        note: '视频平台分析需要专门的API集成',
      }
    };
  }

  private async analyzeGenericPlatform(url: string, platform: string, focus: string): Promise<any> {
    // 通用平台分析
    const webAnalysis = await webService.scrapeWebpage(url, ['all']);
    
    return {
      platform_url: url,
      platform_type: platform,
      analysis_focus: focus,
      profile: {
        type: 'generic',
        content_type: this.identifyContentType(webAnalysis),
      },
      content_analysis: webAnalysis.content_analysis,
      social_links: webAnalysis.content_analysis?.social_links || {},
      extraction_confidence: webAnalysis.extraction_confidence || 0.4,
      metadata: {
        extracted_at: new Date().toISOString(),
        data_source: 'generic_web_scraping',
      }
    };
  }

  // =============== LinkedIn处理方法 ===============

  private async processExportedData(dataFile: string): Promise<any> {
    try {
      // 处理用户导出的LinkedIn数据
      const data = JSON.parse(Buffer.from(dataFile, 'base64').toString('utf-8'));
      return this.normalizeLinkedInData(data, 'exported');
    } catch {
      return this.createLinkedInTemplate('', '用户导出数据解析失败');
    }
  }

  private async processPDFResume(dataFile: string): Promise<any> {
    try {
      // 处理LinkedIn生成的PDF简历
      // 这里需要调用文档服务
      return this.createLinkedInTemplate('', 'PDF简历解析功能开发中');
    } catch {
      return this.createLinkedInTemplate('', 'PDF简历解析失败');
    }
  }

  private normalizeLinkedInData(rawData: any, source: string): any {
    return {
      platform: 'linkedin',
      data_source: source,
      profile: {
        name: rawData.name || '未知用户',
        title: rawData.title || '职位信息',
        company: rawData.company || '公司信息',
        location: rawData.location || '位置信息',
        summary: rawData.summary || '个人简介',
      },
      experience: rawData.experience || [],
      education: rawData.education || [],
      skills: rawData.skills || [],
      recommendations: rawData.recommendations || [],
      extraction_confidence: 0.95,
      metadata: {
        extracted_at: new Date().toISOString(),
        data_source: source,
        compliance_note: '数据来源于用户授权导出',
      }
    };
  }

  // =============== 整合分析方法 ===============

  private createUnifiedProfile(profiles: any[], primaryPlatform: string): any {
    const unifiedProfile: any = {
      primary_platform: primaryPlatform,
      name: '',
      title: '',
      bio: '',
      location: '',
      skills: [],
      platforms: [],
    };

    profiles.forEach(profile => {
      if (profile.data) {
        const data = profile.data;
        
        // 收集基本信息
        if (data.profile?.name && !unifiedProfile.name) {
          unifiedProfile.name = data.profile.name;
        }
        if (data.profile?.title && !unifiedProfile.title) {
          unifiedProfile.title = data.profile.title;
        }
        if (data.profile?.bio && !unifiedProfile.bio) {
          unifiedProfile.bio = data.profile.bio;
        }
        if (data.profile?.location && !unifiedProfile.location) {
          unifiedProfile.location = data.profile.location;
        }

        // 收集技能
        if (data.content_analysis?.technical_skills) {
          unifiedProfile.skills.push(...data.content_analysis.technical_skills);
        }

        // 记录平台信息
        unifiedProfile.platforms.push({
          platform: profile.platform,
          url: profile.url,
          verified: true,
          influence_score: data.influence_metrics ? this.calculateInfluenceScore(data.influence_metrics) : 0,
        });
      }
    });

    // 去重技能
    unifiedProfile.skills = [...new Set(unifiedProfile.skills)];

    return unifiedProfile;
  }

  private calculateCrossPlatformInfluence(profiles: any[]): any {
    let totalFollowers = 0;
    let totalEngagement = 0;
    let platformCount = 0;

    profiles.forEach(profile => {
      if (profile.data?.influence_metrics) {
        const metrics = profile.data.influence_metrics;
        totalFollowers += metrics.followers || 0;
        totalEngagement += metrics.engagement_rate || 0;
        platformCount++;
      }
    });

    return {
      total_followers: totalFollowers,
      average_engagement: platformCount > 0 ? totalEngagement / platformCount : 0,
      platform_diversity: platformCount,
      influence_score: Math.min((totalFollowers / 1000) * 20 + (platformCount * 10), 100),
    };
  }

  private analyzeProfileConsistency(profiles: any[]): any {
    const consistency = {
      name_consistency: true,
      bio_consistency: true,
      skill_consistency: true,
      inconsistencies: [] as string[],
      consistency_score: 100,
    };

    // 简化的一致性检查
    const names = profiles
      .map(p => p.data?.profile?.name)
      .filter(name => name);
    
    if (new Set(names).size > 1) {
      consistency.name_consistency = false;
      consistency.inconsistencies.push('姓名在不同平台不一致');
      consistency.consistency_score -= 20;
    }

    return consistency;
  }

  // =============== 辅助方法 ===============

  private detectSocialPlatform(url: string): { platform: string; valid: boolean; reason?: string } {
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

  private validateLinkedInUrl(url: string): { valid: boolean; reason?: string } {
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

  private createLinkedInTemplate(profileUrl: string, errorMessage?: string): any {
    return {
      platform: 'linkedin',
      profile_url: profileUrl,
      data_source: 'template',
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
      extraction_confidence: 0.1,
      metadata: {
        extracted_at: new Date().toISOString(),
        is_template: true,
        note: errorMessage || '这是一个数据模板，请根据您的LinkedIn资料填写实际信息',
        compliance_note: '遵守LinkedIn服务条款，建议用户使用官方数据导出功能'
      }
    };
  }

  private createLinkedInErrorResponse(profileUrl: string, errorMessage: string): any {
    return {
      platform: 'linkedin',
      profile_url: profileUrl,
      error: errorMessage,
      extraction_confidence: 0,
      metadata: {
        extracted_at: new Date().toISOString(),
        error_occurred: true,
      },
      alternative_suggestions: [
        '使用LinkedIn官方数据导出功能',
        '上传LinkedIn生成的PDF简历',
        '手动填写职业信息',
        '提供其他专业平台链接'
      ]
    };
  }

  // =============== 提取辅助方法（简化版） ===============

  private extractDesignSpecialization(analysis: any): string {
    // 基于内容分析推断设计专业方向
    const content = analysis.extracted_content?.sections || [];
    const keywords = ['UI', 'UX', 'graphic', 'web design', '界面设计', '视觉设计'];
    
    for (const keyword of keywords) {
      if (JSON.stringify(content).toLowerCase().includes(keyword.toLowerCase())) {
        return keyword;
      }
    }
    
    return '设计师';
  }

  private assessPortfolioQuality(analysis: any): number {
    let score = 50; // 基础分
    
    if (analysis.content_analysis?.has_valuable_content) score += 20;
    if (analysis.content_analysis?.content_quality > 70) score += 20;
    if (analysis.extracted_content?.sections?.length > 3) score += 10;
    
    return Math.min(score, 100);
  }

  private extractFollowerCount(analysis: any): number {
    // 简化的粉丝数提取
    const text = JSON.stringify(analysis).toLowerCase();
    const match = text.match(/(\d+)[\s]*(?:followers|粉丝|关注者)/);
    return match ? parseInt(match[1]) : 0;
  }

  private calculateEngagementRate(analysis: any): number {
    // 简化的参与度计算
    return Math.random() * 10; // 模拟数据
  }

  private calculateInfluenceScore(metrics: any): number {
    const followers = metrics.followers || 0;
    const engagement = metrics.engagement_rate || 0;
    
    return Math.min((followers / 1000) * 30 + engagement * 7, 100);
  }

  private estimateProjectCount(analysis: any): number {
    const projects = analysis.extracted_content?.sections?.find((s: any) => s.type === 'projects');
    return projects?.projects?.length || 0;
  }

  private analyzeStyleConsistency(analysis: any): string {
    return '风格统一'; // 简化实现
  }

  private extractDesignSkills(analysis: any): string[] {
    const skills = ['Figma', 'Sketch', 'Adobe Creative Suite', 'Prototyping', 'User Research'];
    return skills.slice(0, 3); // 模拟提取
  }

  private extractLikeCount(analysis: any): number { return 0; }
  private extractViewCount(analysis: any): number { return 0; }
  private analyzeWritingStyle(analysis: any): string { return 'professional'; }
  private extractExpertiseFromContent(analysis: any): string[] { return ['技术', '产品']; }
  private estimateArticleCount(analysis: any): number { return 0; }
  private extractContentTopics(analysis: any): string[] { return ['技术分享']; }
  private assessWritingQuality(analysis: any): number { return 75; }
  private extractClapCount(analysis: any): number { return 0; }
  private estimateReadingTime(analysis: any): number { return 5; }
  private extractChannelTheme(analysis: any): string { return '教育'; }
  private analyzeVideoStyle(analysis: any): string { return '教程'; }
  private estimateVideoCount(analysis: any): number { return 0; }
  private extractSubscriberCount(analysis: any): number { return 0; }
  private extractTotalViews(analysis: any): number { return 0; }
  private identifyContentType(analysis: any): string { return 'mixed'; }

  private generateIntegrationRecommendations(consistency: any, influence: any): string[] {
    const recommendations: string[] = [];
    
    if (!consistency.name_consistency) {
      recommendations.push('统一各平台的姓名显示');
    }
    
    if (influence.platform_diversity < 3) {
      recommendations.push('考虑扩展到更多专业平台');
    }
    
    if (influence.influence_score < 50) {
      recommendations.push('提高内容质量和发布频率');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('您的社交网络档案很完善，继续保持');
    }
    
    return recommendations;
  }

  private calculateIntegrationConfidence(profiles: any[]): number {
    const validProfiles = profiles.filter(p => p.analyzed && p.data);
    const avgConfidence = validProfiles.reduce((sum, p) => 
      sum + (p.data.extraction_confidence || 0), 0
    ) / validProfiles.length;
    
    return Math.min(avgConfidence + (validProfiles.length * 0.1), 1.0);
  }
}

export const socialService = new SocialService(); 