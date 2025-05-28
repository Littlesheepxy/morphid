-- MorphID 数据库迁移 - 共享数据库版本
-- 在现有的父项目数据库基础上添加 MorphID 功能表

-- 1. 修改现有用户表，添加 MorphID 需要的字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS projects TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT 'gpt-4o';

-- 2. 创建 MorphID 页面表
CREATE TABLE IF NOT EXISTS morphid_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  theme TEXT DEFAULT 'zen',
  layout TEXT DEFAULT 'grid',
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'link-only')),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. 创建 MorphID 页面模块表
CREATE TABLE IF NOT EXISTS morphid_page_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id UUID REFERENCES morphid_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. 创建 MorphID 页面访问统计表
CREATE TABLE IF NOT EXISTS morphid_page_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id UUID REFERENCES morphid_pages(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. 创建 MorphID 模板表
CREATE TABLE IF NOT EXISTS morphid_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT NOT NULL,
  layout TEXT NOT NULL,
  preview_image TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 6. 创建 MorphID 用户资源表
CREATE TABLE IF NOT EXISTS morphid_user_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_projects ON users USING GIN(projects);
CREATE INDEX IF NOT EXISTS idx_morphid_pages_user_id ON morphid_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_morphid_pages_slug ON morphid_pages(slug);
CREATE INDEX IF NOT EXISTS idx_morphid_pages_visibility ON morphid_pages(visibility);
CREATE INDEX IF NOT EXISTS idx_morphid_pages_featured ON morphid_pages(is_featured);
CREATE INDEX IF NOT EXISTS idx_morphid_page_blocks_page_id ON morphid_page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_morphid_page_blocks_position ON morphid_page_blocks(position);
CREATE INDEX IF NOT EXISTS idx_morphid_page_analytics_page_id ON morphid_page_analytics(page_id);
CREATE INDEX IF NOT EXISTS idx_morphid_page_analytics_visited_at ON morphid_page_analytics(visited_at);

-- 8. 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. 为 MorphID 表添加更新时间触发器
CREATE TRIGGER update_morphid_pages_updated_at BEFORE UPDATE ON morphid_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_morphid_page_blocks_updated_at BEFORE UPDATE ON morphid_page_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_morphid_templates_updated_at BEFORE UPDATE ON morphid_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. 启用 MorphID 表的行级安全策略
ALTER TABLE morphid_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE morphid_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE morphid_page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE morphid_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE morphid_user_assets ENABLE ROW LEVEL SECURITY;

-- 11. 创建 MorphID 表的 RLS 策略

-- MorphID 页面表策略
CREATE POLICY "Users can view own morphid pages" ON morphid_pages
  FOR SELECT USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can view public morphid pages" ON morphid_pages
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can manage own morphid pages" ON morphid_pages
  FOR ALL USING (user_id = auth.jwt()->>'sub');

-- MorphID 页面模块策略
CREATE POLICY "Users can view morphid page blocks of accessible pages" ON morphid_page_blocks
  FOR SELECT USING (page_id IN (
    SELECT id FROM morphid_pages WHERE 
      visibility = 'public' OR 
      user_id = auth.jwt()->>'sub'
  ));

CREATE POLICY "Users can manage own morphid page blocks" ON morphid_page_blocks
  FOR ALL USING (page_id IN (
    SELECT id FROM morphid_pages WHERE user_id = auth.jwt()->>'sub'
  ));

-- MorphID 访问统计策略（只允许插入，用于匿名访问统计）
CREATE POLICY "Allow anonymous morphid page view tracking" ON morphid_page_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own morphid page analytics" ON morphid_page_analytics
  FOR SELECT USING (page_id IN (
    SELECT id FROM morphid_pages WHERE user_id = auth.jwt()->>'sub'
  ));

-- MorphID 模板策略
CREATE POLICY "Everyone can view public morphid templates" ON morphid_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own morphid templates" ON morphid_templates
  FOR SELECT USING (created_by = auth.jwt()->>'sub');

CREATE POLICY "Users can manage own morphid templates" ON morphid_templates
  FOR ALL USING (created_by = auth.jwt()->>'sub');

-- MorphID 用户资源策略
CREATE POLICY "Users can manage own morphid assets" ON morphid_user_assets
  FOR ALL USING (user_id = auth.jwt()->>'sub');

-- 12. 创建一些示例 MorphID 模板（可选）
INSERT INTO morphid_templates (name, description, theme, layout, template_data, is_public) VALUES
('极简开发者', '适合程序员的极简风格模板', 'zen', 'grid', '{"blocks": [{"type": "hero", "data": {"title": "开发者姓名", "subtitle": "全栈工程师"}}]}', true),
('创意设计师', '适合设计师的创意风格模板', 'creative', 'hero', '{"blocks": [{"type": "hero", "data": {"title": "设计师姓名", "subtitle": "UI/UX设计师"}}]}', true),
('AI 工程师', '适合 AI 工程师的专业模板', 'devgrid', 'grid', '{"blocks": [{"type": "hero", "data": {"title": "AI 工程师", "subtitle": "机器学习专家"}}]}', true)
ON CONFLICT DO NOTHING;

-- 13. 为现有用户添加 MorphID 访问权限（可选）
-- 这将为所有现有用户自动添加 MorphID 项目访问权限
UPDATE users 
SET projects = COALESCE(projects, '{}') || '["morphid"]'::jsonb
WHERE NOT (projects @> '["morphid"]'::jsonb) OR projects IS NULL;

-- 完成提示
SELECT 'MorphID 共享数据库迁移完成！所有现有用户已获得 MorphID 访问权限。' as message; 