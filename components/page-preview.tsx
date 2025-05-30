"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Code, Download } from "lucide-react"

interface PagePreviewProps {
  page: any
}

export default function PagePreview({ page }: PagePreviewProps) {
  if (!page) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Eye className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">页面预览</h3>
          <p className="text-gray-500">生成的页面将在这里显示</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">页面预览</h2>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              <Code className="w-3 h-3 mr-1" />
              实时预览
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Download className="w-3 h-3 mr-1" />
              可下载
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{page.title || "未命名页面"}</CardTitle>
            <div className="flex gap-2">
              <Badge variant="default">{page.theme || "默认主题"}</Badge>
              <Badge variant="secondary">{page.layout || "默认布局"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              页面包含 {page.blocks?.length || 0} 个模块
            </p>
            
            {page.blocks && page.blocks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">页面模块：</h4>
                {page.blocks.map((block: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{block.type}</div>
                        <div className="text-xs text-gray-500">位置: {block.position}</div>
                      </div>
                    </div>
                    <Badge variant={block.is_visible ? "default" : "secondary"} className="text-xs">
                      {block.is_visible ? "可见" : "隐藏"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">预览信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">生成时间:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">状态:</span>
                <Badge variant="default" className="text-xs">已生成</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">技术栈:</span>
                <span>Next.js + TypeScript</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}