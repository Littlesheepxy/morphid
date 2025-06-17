/**
 * WebContainer 服务类
 * 统一管理 WebContainer 的生命周期和操作
 */

import { WebContainer, type FileSystemTree, auth } from '@webcontainer/api';

export interface CodeFile {
  filename: string;
  content: string;
  language: string;
  type: 'component' | 'page' | 'styles' | 'config' | 'data';
  description?: string;
}

export interface WebContainerConfig {
  clientId: string;
  scope?: string;
  workdirName?: string;
  coep?: 'require-corp' | 'credentialless' | 'none';
  forwardPreviewErrors?: boolean;
}

export type ContainerStatus = 'idle' | 'initializing' | 'installing' | 'building' | 'running' | 'error';

export class WebContainerService {
  private instance: WebContainer | null = null;
  private isInitialized = false;
  private config: WebContainerConfig;
  private statusListeners: ((status: ContainerStatus) => void)[] = [];
  private logListeners: ((log: string) => void)[] = [];

  constructor(config: WebContainerConfig) {
    this.config = {
      scope: '',
      workdirName: 'heysme-project',
      coep: 'credentialless',
      forwardPreviewErrors: true,
      ...config
    };
  }

  /**
   * 初始化 WebContainer 认证
   */
  async initAuth(): Promise<void> {
    try {
      await auth.init({
        clientId: this.config.clientId,
        scope: this.config.scope || '',
      });
      this.log('✅ WebContainer认证初始化成功');
    } catch (error) {
      this.log(`❌ WebContainer认证初始化失败: ${error}`);
      throw error;
    }
  }

  /**
   * 创建 WebContainer 实例
   */
  async boot(): Promise<WebContainer> {
    if (this.instance) {
      return this.instance;
    }

    try {
      this.updateStatus('initializing');
      this.log('🚀 正在启动WebContainer...');

      // 等待认证完成
      await auth.loggedIn();
      this.log('✅ WebContainer认证成功');

      // 创建实例
      this.instance = await WebContainer.boot({
        coep: this.config.coep,
        workdirName: this.config.workdirName,
        forwardPreviewErrors: this.config.forwardPreviewErrors
      });

      this.log('✅ WebContainer实例创建成功');
      this.isInitialized = true;

      // 设置事件监听器
      this.setupEventListeners();

      return this.instance;
    } catch (error) {
      this.updateStatus('error');
      this.log(`❌ WebContainer启动失败: ${error}`);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.instance) return;

    // 监听服务器就绪事件
    this.instance.on('server-ready', (port, url) => {
      this.log(`🌐 开发服务器启动成功: ${url} (端口: ${port})`);
      this.updateStatus('running');
    });

    // 监听端口变化
    this.instance.on('port', (port, type, url) => {
      this.log(`🔌 端口 ${port} ${type}: ${url}`);
    });

    // 监听错误
    this.instance.on('error', (error) => {
      this.log(`❌ WebContainer错误: ${error.message}`);
      this.updateStatus('error');
    });

    // 监听预览消息
    this.instance.on('preview-message', (message) => {
      console.log('预览消息:', message);
    });
  }

  /**
   * 挂载文件到WebContainer
   */
  async mountFiles(files: CodeFile[]): Promise<void> {
    if (!this.instance) {
      throw new Error('WebContainer实例未初始化');
    }

    try {
      this.updateStatus('installing');
      this.log('📁 正在挂载文件系统...');

      const fileSystemTree = this.createFileSystemTree(files);
      await this.instance.mount(fileSystemTree);
      
      this.log('✅ 文件系统挂载成功');
    } catch (error) {
      this.log(`❌ 文件挂载失败: ${error}`);
      throw error;
    }
  }

  /**
   * 安装依赖
   */
  async installDependencies(): Promise<void> {
    if (!this.instance) {
      throw new Error('WebContainer实例未初始化');
    }

    try {
      this.log('📦 正在安装依赖...');
      
      const installProcess = await this.instance.spawn('npm', ['install']);
      const exitCode = await installProcess.exit;
      
      if (exitCode !== 0) {
        throw new Error(`依赖安装失败，退出码: ${exitCode}`);
      }
      
      this.log('✅ 依赖安装成功');
    } catch (error) {
      this.log(`❌ 依赖安装失败: ${error}`);
      throw error;
    }
  }

  /**
   * 启动开发服务器
   */
  async startDevServer(): Promise<void> {
    if (!this.instance) {
      throw new Error('WebContainer实例未初始化');
    }

    try {
      this.updateStatus('building');
      this.log('🏗️ 正在启动开发服务器...');
      
      // 启动开发服务器 (不等待退出，因为服务器会持续运行)
      await this.instance.spawn('npm', ['run', 'dev']);
      
    } catch (error) {
      this.log(`❌ 开发服务器启动失败: ${error}`);
      throw error;
    }
  }

  /**
   * 写入文件
   */
  async writeFile(path: string, content: string): Promise<void> {
    if (!this.instance) {
      throw new Error('WebContainer实例未初始化');
    }

    try {
      await this.instance.fs.writeFile(path, content);
      this.log(`📝 文件已更新: ${path}`);
    } catch (error) {
      this.log(`❌ 文件写入失败: ${error}`);
      throw error;
    }
  }

  /**
   * 读取文件
   */
  async readFile(path: string): Promise<string> {
    if (!this.instance) {
      throw new Error('WebContainer实例未初始化');
    }

    try {
      const content = await this.instance.fs.readFile(path, 'utf-8');
      return content;
    } catch (error) {
      this.log(`❌ 文件读取失败: ${error}`);
      throw error;
    }
  }

  /**
   * 创建文件系统树
   */
  private createFileSystemTree(files: CodeFile[]): FileSystemTree {
    const tree: FileSystemTree = {};
    
    // 添加用户文件
    files.forEach(file => {
      const parts = file.filename.split('/');
      let current = tree;
      
      // 创建嵌套目录结构
      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        if (!current[dirName]) {
          current[dirName] = { directory: {} };
        }
        current = (current[dirName] as any).directory;
      }
      
      // 添加文件
      const fileName = parts[parts.length - 1];
      current[fileName] = {
        file: {
          contents: file.content
        }
      };
    });

    // 自动生成必要的配置文件
    this.addRequiredFiles(tree);

    return tree;
  }

  /**
   * 添加必要的配置文件
   */
  private addRequiredFiles(tree: FileSystemTree): void {
    // 如果没有package.json，自动生成
    if (!tree['package.json']) {
      tree['package.json'] = {
        file: {
          contents: JSON.stringify({
            name: this.config.workdirName || 'heysme-project',
            version: '1.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview'
            },
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
              'framer-motion': '^10.16.4',
              'lucide-react': '^0.263.1',
              '@radix-ui/react-slot': '^1.0.2',
              'class-variance-authority': '^0.7.0',
              'clsx': '^2.0.0',
              'tailwind-merge': '^1.14.0'
            },
            devDependencies: {
              '@types/react': '^18.2.15',
              '@types/react-dom': '^18.2.7',
              '@vitejs/plugin-react': '^4.0.3',
              autoprefixer: '^10.4.14',
              postcss: '^8.4.24',
              tailwindcss: '^3.3.0',
              typescript: '^5.0.2',
              vite: '^4.4.5'
            }
          }, null, 2)
        }
      };
    }

    // 如果没有vite.config.js，自动生成
    if (!tree['vite.config.js']) {
      tree['vite.config.js'] = {
        file: {
          contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  }
})`
        }
      };
    }

    // 如果没有tailwind.config.js，自动生成
    if (!tree['tailwind.config.js']) {
      tree['tailwind.config.js'] = {
        file: {
          contents: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
        }
      };
    }

    // 如果没有index.html，自动生成
    if (!tree['index.html']) {
      tree['index.html'] = {
        file: {
          contents: `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HeysMe项目预览</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
        }
      };
    }
  }

  /**
   * 添加状态监听器
   */
  onStatusChange(listener: (status: ContainerStatus) => void): void {
    this.statusListeners.push(listener);
  }

  /**
   * 添加日志监听器
   */
  onLog(listener: (log: string) => void): void {
    this.logListeners.push(listener);
  }

  /**
   * 更新状态
   */
  private updateStatus(status: ContainerStatus): void {
    this.statusListeners.forEach(listener => listener(status));
  }

  /**
   * 记录日志
   */
  private log(message: string): void {
    console.log(message);
    this.logListeners.forEach(listener => listener(message));
  }

  /**
   * 获取实例状态
   */
  get status(): 'ready' | 'not-ready' {
    return this.isInitialized && this.instance ? 'ready' : 'not-ready';
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.instance = null;
    this.isInitialized = false;
    this.statusListeners = [];
    this.logListeners = [];
  }
} 