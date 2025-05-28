import type { AgentWorkflow, CollectedData } from "@/types/agents"
import { DataCollectionAgentClass } from "./data-collection-agent"
import { SummaryAgent } from "./summary-agent"
import { PageCreationAgent } from "./page-creation-agent"

export class AgentWorkflowManager {
  private dataCollectionAgent: DataCollectionAgentClass
  private summaryAgent: SummaryAgent
  private pageCreationAgent: PageCreationAgent
  private workflow: AgentWorkflow
  private startTime: Date

  constructor() {
    this.dataCollectionAgent = new DataCollectionAgentClass()
    this.summaryAgent = new SummaryAgent()
    this.pageCreationAgent = new PageCreationAgent()
    this.startTime = new Date()

    // 初始化工作流状态
    this.workflow = {
      currentAgent: "data_collection",
      step: "welcome",
      collectedData: [],
    }
  }

  /**
   * 处理用户消息的主入口
   * 根据当前工作流状态路由到相应的Agent
   */
  async processMessage(
    message: string,
    modelId = "gpt-4o",
  ): Promise<{
    content: string
    options?: any[]
    nextStep?: string
    needsDataSource?: boolean
    workflow?: AgentWorkflow
    generatedPage?: any
    analysis?: string
    recommendations?: string[]
    metadata?: {
      processingTime: number
      agentUsed: string
      confidence: number
    }
  }> {
    const processingStart = Date.now()

    try {
      let result: any

      switch (this.workflow.currentAgent) {
        case "data_collection":
          result = await this.handleDataCollection(message)
          break

        case "summary":
          result = await this.handleSummary(modelId)
          break

        case "page_creation":
          result = await this.handlePageCreation(modelId)
          break

        default:
          throw new Error(`Unknown agent: ${this.workflow.currentAgent}`)
      }

      // 添加处理元数据
      const processingTime = Date.now() - processingStart
      result.metadata = {
        processingTime,
        agentUsed: this.workflow.currentAgent,
        confidence: this.calculateConfidence(),
        ...result.metadata,
      }

      return result
    } catch (error) {
      console.error("工作流处理失败:", error)
      return {
        content: "抱歉，处理过程中出现了错误。让我们重新开始吧。",
        workflow: this.workflow,
        metadata: {
          processingTime: Date.now() - processingStart,
          agentUsed: this.workflow.currentAgent,
          confidence: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  /**
   * 处理数据收集阶段
   * 负责收集用户信息和外部数据源
   */
  private async handleDataCollection(message: string) {
    const result = await this.dataCollectionAgent.processMessage(message, this.workflow.collectedData)

    // 更新工作流数据
    if (result.collectedData) {
      this.workflow.collectedData = result.collectedData
    }

    // 检查是否需要转到下一阶段
    if (result.nextStep === "summary") {
      this.workflow.currentAgent = "summary"
      this.workflow.step = "analysis"

      // 自动触发分析阶段
      return await this.handleSummary()
    }

    return {
      ...result,
      workflow: this.workflow,
    }
  }

  /**
   * 处理分析总结阶段
   * 使用AI分析收集到的数据，生成用户画像
   */
  private async handleSummary(modelId = "gpt-4o") {
    try {
      // 验证数据完整性
      if (!this.workflow.collectedData.length) {
        return {
          content: "❌ 没有收集到足够的数据进行分析。请先完成信息收集。",
          workflow: this.workflow,
        }
      }

      const result = await this.summaryAgent.analyzeData(this.workflow.collectedData, modelId)

      // 更新工作流状态
      this.workflow.userProfile = result.userProfile
      this.workflow.currentAgent = "page_creation"
      this.workflow.step = "generation"

      return {
        content: `📊 **信息分析完成！**

${result.analysis}

**个人画像摘要：**
• 角色定位：${result.userProfile.basic.title || "未明确"}
• 核心技能：${result.userProfile.professional.skills?.slice(0, 3).join("、") || "待补充"}
• 主要目标：${result.userProfile.preferences.purpose || "待明确"}

**优化建议：**
${result.recommendations.map((rec) => `• ${rec}`).join("\n")}

现在开始为你生成个性化的页面...`,
        analysis: result.analysis,
        recommendations: result.recommendations,
        workflow: this.workflow,
      }
    } catch (error) {
      console.error("分析阶段失败:", error)
      return {
        content: "❌ 信息分析失败。可能是数据格式问题或AI服务暂时不可用，请重试。",
        workflow: this.workflow,
      }
    }
  }

  /**
   * 处理页面创建阶段
   * 基于用户画像生成个性化页面
   */
  private async handlePageCreation(modelId = "gpt-4o") {
    if (!this.workflow.userProfile) {
      return {
        content: "❌ 缺少用户画像数据，无法生成页面。请重新开始流程。",
        workflow: this.workflow,
      }
    }

    try {
      const result = await this.pageCreationAgent.generatePage(this.workflow.userProfile, modelId)

      // 更新工作流状态
      this.workflow.generatedPage = result.pageStructure
      this.workflow.step = "complete"

      // 计算总耗时
      const totalTime = Date.now() - this.startTime.getTime()

      return {
        content: `🎉 **页面生成完成！**

**设计理念：**
${result.designRationale}

**页面特色：**
• 主题风格：${result.pageStructure.theme}
• 布局类型：${result.pageStructure.layout}
• 模块数量：${result.pageStructure.blocks.length}个

**优化建议：**
${result.suggestions.map((sug) => `• ${sug}`).join("\n")}

**生成统计：**
• 总耗时：${Math.round(totalTime / 1000)}秒
• 数据源：${this.workflow.collectedData.length}个
• 使用模型：${modelId}

你可以在右侧查看生成的页面效果！`,
        generatedPage: result.pageStructure,
        recommendations: result.suggestions,
        workflow: this.workflow,
      }
    } catch (error) {
      console.error("页面生成失败:", error)
      return {
        content: "❌ 页面生成失败。可能是AI服务问题或数据格式错误，请重试。",
        workflow: this.workflow,
      }
    }
  }

  /**
   * 集成外部数据源
   * 支持简历文档、社交媒体等数据导入
   */
  async integrateDataSource(sourceId: string, data: any): Promise<CollectedData> {
    const collectedData: CollectedData = {
      source: sourceId,
      type: this.getDataType(sourceId),
      data: this.processSourceData(sourceId, data),
      timestamp: new Date(),
      confidence: this.calculateSourceConfidence(sourceId, data),
    }

    this.workflow.collectedData.push(collectedData)

    // 记录数据源集成日志
    console.log(`数据源集成成功: ${sourceId}`, {
      dataSize: JSON.stringify(data).length,
      confidence: collectedData.confidence,
      timestamp: collectedData.timestamp,
    })

    return collectedData
  }

  /**
   * 根据数据源ID确定数据类型
   */
  private getDataType(sourceId: string): "conversation" | "document" | "social_profile" {
    const typeMap: Record<string, "conversation" | "document" | "social_profile"> = {
      resume: "document",
      linkedin: "social_profile",
      github: "social_profile",
      twitter: "social_profile",
      instagram: "social_profile",
      tiktok: "social_profile",
      conversation: "conversation",
    }

    return typeMap[sourceId] || "conversation"
  }

  /**
   * 处理不同数据源的数据格式
   */
  private processSourceData(sourceId: string, rawData: any): any {
    switch (sourceId) {
      case "resume":
        return this.processResumeData(rawData)
      case "linkedin":
        return this.processLinkedInData(rawData)
      case "github":
        return this.processGitHubData(rawData)
      default:
        return rawData
    }
  }

  /**
   * 处理简历文档数据
   */
  private processResumeData(data: any) {
    return {
      ...data,
      processed_at: new Date().toISOString(),
      extraction_method: "document_parsing",
      // TODO: 实际的简历解析逻辑
      // - PDF文本提取
      // - 结构化信息识别
      // - 技能和经验提取
    }
  }

  /**
   * 处理LinkedIn数据
   */
  private processLinkedInData(data: any) {
    return {
      ...data,
      processed_at: new Date().toISOString(),
      platform: "linkedin",
      // TODO: LinkedIn API集成
      // - 个人资料信息
      // - 工作经历
      // - 技能认证
      // - 推荐信息
    }
  }

  /**
   * 处理GitHub数据
   */
  private processGitHubData(data: any) {
    return {
      ...data,
      processed_at: new Date().toISOString(),
      platform: "github",
      // TODO: GitHub API集成
      // - 仓库统计
      // - 贡献图表
      // - 技术栈分析
      // - 项目展示
    }
  }

  /**
   * 计算数据源的置信度
   */
  private calculateSourceConfidence(sourceId: string, data: any): number {
    const baseConfidence: Record<string, number> = {
      conversation: 0.7,
      resume: 0.95,
      linkedin: 0.9,
      github: 0.85,
      twitter: 0.6,
      instagram: 0.5,
      tiktok: 0.4,
    }

    let confidence = baseConfidence[sourceId] || 0.5

    // 根据数据完整性调整置信度
    const dataSize = JSON.stringify(data).length
    if (dataSize > 1000) confidence += 0.1
    if (dataSize > 5000) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  /**
   * 计算整体工作流的置信度
   */
  private calculateConfidence(): number {
    if (!this.workflow.collectedData.length) return 0

    const avgConfidence =
      this.workflow.collectedData.reduce((sum, data) => sum + data.confidence, 0) / this.workflow.collectedData.length

    // 根据数据源多样性调整
    const uniqueSources = new Set(this.workflow.collectedData.map((d) => d.source)).size
    const diversityBonus = Math.min(uniqueSources * 0.1, 0.3)

    return Math.min(avgConfidence + diversityBonus, 1.0)
  }

  /**
   * 获取当前工作流状态
   */
  getWorkflow(): AgentWorkflow {
    return { ...this.workflow }
  }

  /**
   * 重置工作流到初始状态
   */
  resetWorkflow() {
    this.workflow = {
      currentAgent: "data_collection",
      step: "welcome",
      collectedData: [],
    }
    this.startTime = new Date()
  }

  /**
   * 获取工作流统计信息
   */
  getWorkflowStats() {
    return {
      totalTime: Date.now() - this.startTime.getTime(),
      currentAgent: this.workflow.currentAgent,
      currentStep: this.workflow.step,
      dataSourcesCount: this.workflow.collectedData.length,
      overallConfidence: this.calculateConfidence(),
      hasUserProfile: !!this.workflow.userProfile,
      hasGeneratedPage: !!this.workflow.generatedPage,
    }
  }
}
