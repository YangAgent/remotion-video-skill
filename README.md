# Remotion Video Skill

用于给 Agent 使用、从 SRT 字幕生成 Remotion 视频项目的 Skill 仓库。

当前仓库在 `skills/` 下包含 2 个 skill：

- `srt-remotion-video`：主流程 skill。从 SRT 字幕出发，完成项目初始化、分镜生成、场景组件生成、场景注册校验与最终视频渲染的端到端工作流。
- `remotion-best-practices`：辅助 skill。Remotion 官方 skill 的快照版本，用于为场景生成阶段提供 Remotion 代码规范与最佳实践参考。

## 项目简介

这个项目把“从 SRT 字幕生成 Remotion 视频”的能力沉淀成可复用 skill，供 Agent 直接调用。  
适合教学视频、讲解视频、知识视频等以字幕脚本为主驱动的内容生产场景。

其中，`srt-remotion-video` 负责主流程编排，`remotion-best-practices` 作为辅助 skill，为场景实现阶段提供 Remotion 领域知识和代码参考。

## 核心能力

- SRT 驱动：从字幕文件直接启动整条视频生成流程
- 项目隔离：每次任务默认生成独立的 Remotion 项目目录
- 模板复用：基于内置 `template/` 快速初始化新项目
- 分镜中间产物：输出 `storyboard.json` 作为后续场景实现依据
- 场景注册自动化：自动生成 `generated-scenes.ts`
- 渲染前校验：在渲染前检查分镜、场景文件、导出规范和时序一致性
- 最终导出：通过 Remotion 渲染 `out/output.mp4`

## 使用方式

先准备好一个 `.srt` 字幕文件，然后直接对 Agent 说：

```text
制作 remotion 视频，字幕文件路径是 /absolute/path/to/your-file.srt
```

注意：

- 字幕文件路径应使用绝对路径
- 这是给 Agent 使用的 skill，通常不需要手动逐步执行内部脚本
- 默认会在 SRT 文件所在目录下创建独立的 Remotion 项目目录

## 仓库结构

```text
.
├── README.md
└── skills/
    ├── remotion-best-practices/
    │   ├── SKILL.md
    │   └── rules/
    └── srt-remotion-video/
        ├── SKILL.md
        ├── scripts/
        │   ├── ensure-template-deps.js
        │   ├── init-project.js
        │   ├── generate-storyboard.js
        │   ├── generate-scenes-registry.js
        │   ├── scene-registry-utils.js
        │   └── validate-project.js
        └── template/
            ├── package.json
            └── src/
```

## 主要文件说明

- `skills/remotion-best-practices/SKILL.md`：辅助 skill 入口，提供 Remotion 官方最佳实践快照
- `skills/srt-remotion-video/SKILL.md`：skill 主说明与执行协议
- `skills/srt-remotion-video/scripts/ensure-template-deps.js`：检查模板依赖，必要时执行首次安装
- `skills/srt-remotion-video/scripts/init-project.js`：根据 SRT 路径创建新项目
- `skills/srt-remotion-video/scripts/generate-storyboard.js`：根据 SRT 和分组结果生成 `storyboard.json`
- `skills/srt-remotion-video/scripts/generate-scenes-registry.js`：生成 `src/compositions/generated-scenes.ts`
- `skills/srt-remotion-video/scripts/validate-project.js`：渲染前校验项目完整性
- `skills/srt-remotion-video/template/`：新项目初始化时复制的 Remotion 模板

## 输出结果

Agent 执行完成后，通常会生成一个独立的 Remotion 项目，并输出最终视频文件：

```text
{projectRoot}/out/output.mp4
```

## 模板项目

内置模板位于 `skills/srt-remotion-video/template/`，是一个精简的 Remotion 项目，当前主要依赖包括：

- `remotion`
- `@remotion/cli`
- `react`
- `react-dom`
- `lucide-react`
- `typescript`

模板中已经包含：

- `Root.tsx`
- `Main.tsx`
- `generated-scenes.ts`
- 设计系统基础文件

这使得 Agent 可以把重点放在“根据字幕生成场景内容”，而不是重复搭建宿主工程。

## Skill 关系

- `srt-remotion-video` 是主 skill，负责驱动整条视频生成流程
- `remotion-best-practices` 是辅助 skill，作为 Remotion 官方 skill 的快照版本存在
- 在场景组件生成阶段，主 skill 会引用 `remotion-best-practices` 中的规则与经验，帮助生成更稳定、更符合 Remotion 习惯的代码

## 适用场景

- 从课程字幕自动生成讲解视频
- 从口播字幕快速搭建信息型视频
- 将脚本化内容批量转成 Remotion 项目
- 作为更复杂视频生成 Agent 的基础能力模块

## 注意事项

- 当前仓库由一个主 skill 和一个辅助 skill 组成
- 所有流程默认围绕绝对路径运行
- 每次任务默认新建项目目录，而不是直接修改模板
- 仓库内包含脚本与模板，但主要使用方式仍然是让 Agent 直接调用 skill