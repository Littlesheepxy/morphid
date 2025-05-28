-- MorphID 数据库迁移 - Clerk 集成版本
-- 执行此文件在Supabase SQL编辑器中创建所需的表结构

-- 1. 创建用户表（支持Clerk集成）
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  default_model TEXT DEFAULT 'gpt-4o',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建页面表
CREATE TABLE IF NOT EXISTS pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  theme TEXT DEFAULT 'zen',
  layout TEXT DEFAULT 'grid',
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'link-only')),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建页面模块表
CREATE TABLE IF NOT EXISTS page_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建页面访问统计表
CREATE TABLE IF NOT EXISTS page_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建模板表
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT NOT NULL,
  layout TEXT NOT NULL,
  preview_image TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 创建用户资源表
CREATE TABLE IF NOT EXISTS user_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_visibility ON pages(visibility);
CREATE INDEX IF NOT EXISTS idx_pages_featured ON pages(is_featured);
CREATE INDEX IF NOT EXISTS idx_page_blocks_page_id ON page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_page_blocks_position ON page_blocks(position);
CREATE INDEX IF NOT EXISTS idx_page_analytics_page_id ON page_analytics(page_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_visited_at ON page_analytics(visited_at);

-- 8. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. 为需要的表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_blocks_updated_at BEFORE UPDATE ON page_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. 启用行级安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- 11. 创建RLS策略

-- 用户表策略：用户只能访问自己的记录
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

-- 页面表策略
CREATE POLICY "Users can view own pages" ON pages
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can view public pages" ON pages
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can manage own pages" ON pages
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

-- 页面模块策略
CREATE POLICY "Users can view page blocks of accessible pages" ON page_blocks
  FOR SELECT USING (page_id IN (
    SELECT id FROM pages WHERE 
      visibility = 'public' OR 
      user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  ));

CREATE POLICY "Users can manage own page blocks" ON page_blocks
  FOR ALL USING (page_id IN (
    SELECT id FROM pages WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  ));

-- 访问统计策略（只允许插入，用于匿名访问统计）
CREATE POLICY "Allow anonymous page view tracking" ON page_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own page analytics" ON page_analytics
  FOR SELECT USING (page_id IN (
    SELECT id FROM pages WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  ));

-- 模板策略
CREATE POLICY "Everyone can view public templates" ON templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own templates" ON templates
  FOR SELECT USING (created_by IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can manage own templates" ON templates
  FOR ALL USING (created_by IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

-- 用户资源策略
CREATE POLICY "Users can manage own assets" ON user_assets
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

-- 12. 创建一些示例数据（可选）
-- INSERT INTO templates (name, description, theme, layout, template_data, is_public) VALUES
-- ('极简开发者', '适合程序员的极简风格模板', 'zen', 'grid', '{"blocks": [{"type": "hero", "data": {"title": "开发者姓名", "subtitle": "全栈工程师"}}]}', true),
-- ('创意设计师', '适合设计师的创意风格模板', 'creative', 'hero', '{"blocks": [{"type": "hero", "data": {"title": "设计师姓名", "subtitle": "UI/UX设计师"}}]}', true);

-- 完成提示
SELECT 'MorphID 数据库迁移完成！' as message; 