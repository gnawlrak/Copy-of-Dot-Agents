# Dot Agents - 2D CQB 战术模拟游戏

一个基于 TypeScript 和 Canvas 开发的 2D 近距离战斗（CQB）模拟游戏，具备真实的视觉系统、武器改装和智能 AI。

![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Beta-orange?style=flat-square)

## 🎮 游戏简介

**Dot Agents** 是一款专注于战术模拟的 2D 俯视角射击游戏。玩家扮演特种干员，在各类地图中执行 CQB 任务，对抗具备智能视觉系统的 AI 敌人。

### 特色功能

- **真实视觉系统**：基于光照和视线的能见度机制，玩家和 AI 共享同一套视觉判定
- **角色系统**：多种可选干员，各有不同技能和装备
- **武器改装**：简易的改枪系统，支持配件组合
- **多人联机**：支持局域网联机对战（开发中）
- **亮度感知**：基于环境亮度的动态可视范围

## 🛠️ 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | React + TypeScript |
| 渲染 | HTML5 Canvas 2D |
| 网络 | WebSocket / 自定义协议 |
| 构建 | Vite |

## 📁 项目结构

```
Copy-of-Dot-Agents/
├── components/          # React 组件
│   ├── GameCanvas.tsx   # 游戏主画布
│   └── ...
├── data/                # 游戏数据
│   ├── operators.ts     # 干员定义
│   └── weapons.ts       # 武器定义
├── network.ts           # 网络同步逻辑
├── App.tsx              # 主应用
└── index.html           # 入口
```

## 🚀 开始运行

### 环境要求

- [Node.js](https://nodejs.org/) 18+
- npm 或 yarn

### 安装和运行

1. 克隆仓库：
   ```bash
   git clone https://github.com/gnawlrak/Copy-of-Dot-Agents.git
   cd Copy-of-Dot-Agents
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 设置环境变量（可选）：
   创建 `.env.local` 文件，添加：
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 🎮 操作说明

| 按键 | 动作 |
|------|------|
| WASD | 移动 |
| 鼠标 | 瞄准 |
| 左键 | 射击 |
| R | 换弹 |
| 1-4 | 切换武器 |

## 🧠 AI 系统

- **视觉系统**：AI 使用与玩家相同的视线和亮度判定
- **声音感知**：响应枪声和脚步声
- **战术移动**：利用掩体，寻找侧翼角度
- **难度自适应**：基于玩家表现的动态难度调整

## 📝 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

## 📅 开发状态

- **状态**：Beta
- **最后更新**：2026 年 6 月

---

*由 TypeScript + Canvas 构建* 🚀
