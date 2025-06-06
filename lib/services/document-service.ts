/**
 * 文档处理服务 - 专门处理各类文档的解析和信息提取
 */

// import pdfParse from 'pdf-parse';
// import mammoth from 'mammoth';
// import * as XLSX from 'xlsx';

export class DocumentService {
  
  /**
   * 解析文档
   */
  async parseDocument(fileData: string, fileType: string, options: any = {}): Promise<any> {
    try {
      console.log(`📄 [文档解析] 类型: ${fileType}`);

      const extractMode = options.extract_mode || 'general';
      const language = options.language || 'auto';

      switch (fileType.toLowerCase()) {
        case 'pdf':
          return await this.parsePDF(fileData, extractMode);
        case 'docx':
          return await this.parseDocx(fileData, extractMode);
        case 'xlsx':
          return await this.parseXlsx(fileData, extractMode);
        case 'txt':
          return await this.parseText(fileData, extractMode);
        default:
          throw new Error(`不支持的文件类型: ${fileType}`);
      }

    } catch (error: any) {
      console.error('文档解析失败:', error);
      return this.createErrorResponse(fileType, error.message);
    }
  }

  /**
   * 高级PDF分析
   */
  async analyzePDFAdvanced(fileData: string, options: any = {}): Promise<any> {
    try {
      // 使用基础PDF解析，未来可以集成更高级的OCR功能
      const basicResult = await this.parsePDF(fileData, 'comprehensive');
      
      return {
        ...basicResult,
        advanced_features: {
          ocr_applied: false,
          table_extraction: false,
          image_analysis: false,
          note: '高级功能需要额外的OCR和图像处理库'
        },
        analysis_type: 'pdf_advanced',
      };

    } catch (error: any) {
      return this.createErrorResponse('pdf', error.message);
    }
  }

  // =============== 私有解析方法 ===============

  private async parsePDF(fileData: string, extractMode: string): Promise<any> {
    try {
      // 模拟PDF解析 - 实际实现需要pdf-parse库
      // const buffer = Buffer.from(fileData, 'base64');
      // const pdfData = await pdfParse(buffer);
      
      // 模拟解析结果
      const mockData = this.createMockPDFData(extractMode);
      
      return {
        type: 'pdf',
        extract_mode: extractMode,
        extracted_data: mockData,
        metadata: {
          pages: 2,
          text_length: 1500,
          extraction_method: 'text-based',
          confidence: 0.8,
          note: '这是模拟数据，实际部署时会使用pdf-parse库'
        },
        extraction_confidence: 0.8,
        suggestions: this.generateDocumentSuggestions('pdf', mockData),
      };

    } catch (error: any) {
      throw new Error(`PDF解析失败: ${error.message}`);
    }
  }

  private async parseDocx(fileData: string, extractMode: string): Promise<any> {
    try {
      // 模拟Word文档解析 - 实际实现需要mammoth库
      // const buffer = Buffer.from(fileData, 'base64');
      // const result = await mammoth.extractRawText({buffer});
      
      const mockData = this.createMockDocxData(extractMode);
      
      return {
        type: 'docx',
        extract_mode: extractMode,
        extracted_data: mockData,
        metadata: {
          word_count: 800,
          extraction_method: 'structured',
          confidence: 0.9,
          note: '这是模拟数据，实际部署时会使用mammoth库'
        },
        extraction_confidence: 0.9,
        suggestions: this.generateDocumentSuggestions('docx', mockData),
      };

    } catch (error: any) {
      throw new Error(`Word文档解析失败: ${error.message}`);
    }
  }

  private async parseXlsx(fileData: string, extractMode: string): Promise<any> {
    try {
      // 模拟Excel解析 - 实际实现需要xlsx库
      // const buffer = Buffer.from(fileData, 'base64');
      // const workbook = XLSX.read(buffer, {type: 'buffer'});
      
      const mockData = this.createMockXlsxData(extractMode);
      
      return {
        type: 'xlsx',
        extract_mode: extractMode,
        extracted_data: mockData,
        metadata: {
          sheets: 3,
          total_rows: 150,
          extraction_method: 'structured',
          confidence: 0.95,
          note: '这是模拟数据，实际部署时会使用xlsx库'
        },
        extraction_confidence: 0.95,
        suggestions: this.generateDocumentSuggestions('xlsx', mockData),
      };

    } catch (error: any) {
      throw new Error(`Excel文档解析失败: ${error.message}`);
    }
  }

  private async parseText(fileData: string, extractMode: string): Promise<any> {
    try {
      // 文本文件直接解析
      const text = Buffer.from(fileData, 'base64').toString('utf-8');
      const analysis = this.analyzeTextContent(text, extractMode);
      
      return {
        type: 'txt',
        extract_mode: extractMode,
        extracted_data: analysis,
        metadata: {
          character_count: text.length,
          word_count: text.split(/\s+/).length,
          line_count: text.split('\n').length,
          extraction_method: 'direct',
          confidence: 1.0,
        },
        extraction_confidence: 1.0,
        suggestions: this.generateDocumentSuggestions('txt', analysis),
      };

    } catch (error: any) {
      throw new Error(`文本文件解析失败: ${error.message}`);
    }
  }

  // =============== 内容分析方法 ===============

  private analyzeTextContent(text: string, extractMode: string): any {
    const lines = text.split('\n');
    const words = text.split(/\s+/);
    
    const analysis: any = {
      raw_text: text.substring(0, 2000), // 限制长度
      summary: this.extractSummary(text),
      keywords: this.extractKeywords(text),
      statistics: {
        character_count: text.length,
        word_count: words.length,
        line_count: lines.length,
        paragraph_count: text.split('\n\n').length,
      }
    };

    if (extractMode === 'resume') {
      analysis.resume_sections = this.extractResumeInfo(text);
    }

    return analysis;
  }

  private extractSummary(text: string): string {
    // 简单提取前几句作为摘要
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).join('. ').substring(0, 300) + '...';
  }

  private extractKeywords(text: string): string[] {
    // 简单关键词提取
    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'what', 'your'].includes(word));
    
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractResumeInfo(text: string): any {
    const resumeInfo: any = {
      personal_info: {},
      experience: [],
      education: [],
      skills: [],
      projects: [],
    };

    // 提取邮箱
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) {
      resumeInfo.personal_info.email = emailMatch[0];
    }

    // 提取电话
    const phoneMatch = text.match(/[\+\d\s\-\(\)]{10,}/);
    if (phoneMatch) {
      resumeInfo.personal_info.phone = phoneMatch[0];
    }

    // 提取技能关键词
    const skillKeywords = ['JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'Vue.js', 'Angular', 'Java', 'C++', 'Go', 'Rust'];
    resumeInfo.skills = skillKeywords.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );

    // 简单的工作经历提取
    const workKeywords = ['工作经历', '工作经验', 'experience', 'employment', '职位', '公司'];
    if (workKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
      resumeInfo.experience.push({
        title: '软件开发工程师',
        company: '科技公司',
        period: '2020-至今',
        description: '从文档中提取的工作经历描述...'
      });
    }

    return resumeInfo;
  }

  // =============== 模拟数据生成 ===============

  private createMockPDFData(extractMode: string): any {
    const baseData = {
      summary: 'PDF文档包含专业技术内容，展示了丰富的项目经验和技能。',
      keywords: ['React', 'TypeScript', 'Node.js', '前端开发', '项目管理'],
      text_preview: '这是PDF文档的前几段内容预览...',
    };

    if (extractMode === 'resume') {
      return {
        ...baseData,
        personal_info: {
          name: '张三',
          email: 'zhangsan@example.com',
          phone: '+86 138-0013-8000',
          location: '北京市'
        },
        experience: [
          {
            title: '高级前端工程师',
            company: '科技公司',
            period: '2020-至今',
            description: '负责前端架构设计和团队管理，使用React、TypeScript等技术栈'
          }
        ],
        education: [
          {
            degree: '计算机科学学士',
            school: '北京大学',
            year: '2020',
            major: '计算机科学与技术'
          }
        ],
        skills: ['JavaScript', 'React', 'TypeScript', 'Node.js', 'Python', '项目管理'],
        projects: [
          {
            name: '企业级管理平台',
            description: '使用React和TypeScript开发的大型企业管理系统',
            tech_stack: ['React', 'TypeScript', 'Ant Design', 'Node.js'],
            duration: '6个月'
          }
        ]
      };
    }

    return baseData;
  }

  private createMockDocxData(extractMode: string): any {
    return {
      summary: 'Word文档内容结构清晰，包含详细的项目描述和技能列表。',
      keywords: ['产品设计', 'UI/UX', 'Figma', '用户体验', '原型设计'],
      formatted_content: {
        headings: ['个人简介', '工作经历', '项目经验', '技能专长'],
        paragraphs: 15,
        lists: 8,
        tables: 2
      },
      personal_info: {
        name: '李四',
        email: 'lisi@example.com',
        title: '产品设计师'
      }
    };
  }

  private createMockXlsxData(extractMode: string): any {
    return {
      summary: 'Excel文档包含结构化的项目数据和技能评估表格。',
      sheets_analysis: [
        {
          name: '项目列表',
          rows: 25,
          columns: 8,
          data_type: '项目管理数据'
        },
        {
          name: '技能评估',
          rows: 50,
          columns: 4,
          data_type: '技能评分表'
        }
      ],
      extracted_tables: [
        {
          title: '项目经验统计',
          data: [
            ['项目名称', '技术栈', '持续时间', '团队规模'],
            ['电商平台', 'React, Node.js', '8个月', '5人'],
            ['管理系统', 'Vue.js, Python', '6个月', '3人']
          ]
        }
      ]
    };
  }

  // =============== 辅助方法 ===============

  private generateDocumentSuggestions(fileType: string, extractedData: any): any {
    const suggestions: any = {
      display_format: 'structured',
      iframe_display: false,
      reason: '文档内容适合结构化展示',
    };

    switch (fileType) {
      case 'pdf':
        suggestions.recommended_sections = ['personal_info', 'experience', 'skills'];
        suggestions.export_options = ['格式化简历', '技能图表', '时间线展示'];
        break;
      case 'docx':
        suggestions.recommended_sections = ['formatted_content', 'personal_info'];
        suggestions.export_options = ['保留格式导出', '纯文本提取', '结构化展示'];
        break;
      case 'xlsx':
        suggestions.recommended_sections = ['tables', 'charts', 'statistics'];
        suggestions.export_options = ['表格展示', '图表可视化', '数据分析'];
        break;
      case 'txt':
        suggestions.recommended_sections = ['summary', 'keywords', 'statistics'];
        suggestions.export_options = ['文本分析', '关键词云', '内容摘要'];
        break;
    }

    return suggestions;
  }

  private createErrorResponse(fileType: string, errorMessage: string): any {
    return {
      type: fileType,
      error: errorMessage,
      extracted_data: null,
      suggestions: {
        iframe_display: false,
        reason: '文档解析失败',
        alternative_actions: [
          '检查文件格式是否正确',
          '尝试重新上传文件',
          '提供其他格式的文档',
          '手动输入关键信息'
        ]
      },
      extraction_confidence: 0,
      metadata: {
        extracted_at: new Date().toISOString(),
        error_occurred: true,
        supported_formats: ['pdf', 'docx', 'xlsx', 'txt']
      }
    };
  }

  /**
   * 获取支持的文件类型
   */
  getSupportedFileTypes(): string[] {
    return ['pdf', 'docx', 'xlsx', 'txt'];
  }

  /**
   * 验证文件类型
   */
  validateFileType(fileName: string): { valid: boolean; type?: string; reason?: string } {
    if (!fileName) {
      return { valid: false, reason: '文件名不能为空' };
    }
    
    const extension = fileName.toLowerCase().split('.').pop();
    if (!extension) {
      return { valid: false, reason: '无法识别文件类型' };
    }
    
    const supportedTypes = this.getSupportedFileTypes();
    if (!supportedTypes.includes(extension)) {
      return { 
        valid: false, 
        reason: `不支持的文件类型：${extension}。支持的类型：${supportedTypes.join(', ')}` 
      };
    }
    
    return { valid: true, type: extension };
  }

  /**
   * 估算处理时间
   */
  estimateProcessingTime(fileType: string, fileSize?: number): number {
    const baseTime = {
      pdf: 15000,
      docx: 8000,
      xlsx: 10000,
      txt: 2000,
    };
    
    let time = baseTime[fileType as keyof typeof baseTime] || 10000;
    
    // 根据文件大小调整时间
    if (fileSize) {
      const sizeMB = fileSize / (1024 * 1024);
      if (sizeMB > 5) {
        time *= 1.5; // 大文件增加50%时间
      } else if (sizeMB > 10) {
        time *= 2; // 超大文件翻倍时间
      }
    }
    
    return Math.round(time);
  }
}

export const documentService = new DocumentService(); 