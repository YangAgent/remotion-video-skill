---
name: srt-remotion-video
description: SRT 字幕驱动的视频生成主流程。将 SRT 字幕文件转换为 Remotion 视频项目，自动生成分镜脚本、创建场景组件、合成最终视频。当用户需要从 SRT 字幕文件生成 Remotion 视频时使用。
---

# SRT Remotion Video - 主流程编排

将 SRT 字幕文件转换为 Remotion 视频的完整工作流。

## 工作流概览

```text
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────────┐   ┌──────────┐
│ 获取 SRT │ → │ 依赖预检 │ → │ 项目初始化│ → │ 生成分镜 │ → │ 并行 Creator 规划实现 │ → │ 合成视频 │
│ 文件路径 │   │ / 首次安装│   │          │   │          │   │ scene-plan + code    │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────────────────┘   └──────────┘
```

## 项目目录结构

```text
<skillRoot>/
├── SKILL.md
├── template/
├── references/
│   ├── storyboard-parser.md
│   └── scene-component-creator.md
└── scripts/
    ├── ensure-template-deps.js
    ├── init-project.js
    ├── generate-storyboard.js
    ├── generate-creator-scenes.js
    ├── generate-scenes-registry.js
    ├── scene-registry-utils.js
    ├── validate-project.js
    └── validate-scene-plan.js

<srtDir>/
├── your-file.srt
└── remotion-video-projects/
    └── {yyyy-mm-dd-hh-mm-ss}/
```

## Path Contract

主流程和所有 SubAgent 统一使用以下绝对路径约定：

- `skillRoot`: 当前 `srt-remotion-video` skill 目录的绝对路径
- `templateRoot`: `{skillRoot}/template`
- `referencesRoot`: `{skillRoot}/references`
- `scriptsRoot`: `{skillRoot}/scripts`
- `srtPath`: 用户提供的 SRT 文件绝对路径
- `projectBaseDir`: `{dirname(srtPath)}/remotion-video-projects`
- `projectRoot`: 当前项目实例目录，格式为 `{projectBaseDir}/{projectName}/`

**强制要求**：

- SubAgent prompt 中必须写入展开后的绝对路径，不要只传变量名
- 阶段协议文档只能从 `referencesRoot` 读取
- 脚本只能从 `scriptsRoot` 执行
- 所有运行态状态必须由主 Agent 显式传递

## 执行流程

### 步骤 0: 获取 SRT 文件

1. 询问用户 SRT 文件路径
2. 如果用户给的是相对路径，主 Agent 必须先自行判断该文件是否存在
3. 若存在，主 Agent 必须先解析为绝对路径，再将解析后的绝对路径作为 `srtPath`
4. 若不存在，必须明确反馈用户路径无效，并要求提供正确路径
5. 后续所有步骤统一使用最终确认过的绝对路径 `srtPath`

### 步骤 1: 依赖预检与项目初始化

> **关键**：模板始终从 skill 内部复制，所有工作在字幕目录下的独立项目目录进行。

#### 1.0 依赖预检（首次使用时自动安装）

执行：

```bash
node "{skillRoot}/scripts/ensure-template-deps.js" "{templateRoot}"
```

脚本会：

1. 检查 `{templateRoot}/package.json` 和 `{templateRoot}/package-lock.json`
2. 检查模板关键依赖是否已安装
3. 若未安装，则在 `{templateRoot}` 下执行一次 `npm install`
4. 若已安装，则直接跳过安装
5. 安装或校验失败时返回明确错误，并停止主流程

#### 1.1 默认行为：创建新项目

执行：

```bash
node "{skillRoot}/scripts/init-project.js" --srt-path "{srtPath}"
```

脚本会：

1. 确保 `{dirname(srtPath)}/remotion-video-projects/` 存在
2. 创建新的项目目录 `remotion-video-projects/{yyyy-mm-dd-hh-mm-ss}/`
3. 从 `{skillRoot}/template/` 复制模板文件；若模板依赖已安装，则一并复制已安装依赖
4. 输出项目信息 JSON

#### 1.2 用户指定项目路径（仅当用户明确指定时）

如果用户明确指定了项目路径，则直接使用该路径作为 `projectRoot`，跳过默认目录推导。

#### 1.3 记录关键路径

从脚本输出或用户指定路径获取：

- `projectRoot`
- `skillRoot`
- `templateRoot`
- `referencesRoot`
- `scriptsRoot`
- `srtPath`

后续所有步骤都使用这些绝对路径。

### 步骤 2: 生成分镜脚本

必须使用 SubAgent 执行此步骤。

主 Agent 负责：

1. 计算并展开绝对路径：
   - `storyboardReference = {referencesRoot}/storyboard-parser.md`
   - `storyboardScript = {scriptsRoot}/generate-storyboard.js`
2. 启动一个 SubAgent
3. 在 prompt 中写入实际绝对路径值

SubAgent prompt 模板：

```text
你正在执行 srt-remotion-video 工作流的“分镜生成阶段”。

首先读取以下参考协议并严格按其步骤执行：
- {storyboardReference}

输入参数：
- skillRoot: {skillRoot}
- projectRoot: {projectRoot}
- srtPath: {srtPath}

重要：
1. 所有路径都已展开为绝对路径，不要自行猜测
2. 需要执行的脚本位于 {storyboardScript}
3. 完成后必须按参考协议中的“完成后返回”契约，返回结构化结果
```

主流程必须等待返回结果，并读取 `storyboard.json` 验证结构正确。

### 步骤 3: 使用 SubAgent 规划并实现场景组件

读取 `storyboard.json`，获取所有场景数据。

#### 3.0 前置准备：计算分组

```typescript
const SCENES_PER_CREATOR = 5;
const sceneCount = storyboard.scenes.length;
const creatorCount = Math.ceil(sceneCount / SCENES_PER_CREATOR);
```

`creatorId` 生成规则固定为：

```typescript
const creatorId = `creator-${String(index + 1).padStart(2, '0')}`;
```

示例：

- 第 1 个 creator: `creator-01`
- 第 2 个 creator: `creator-02`
- 第 10 个 creator: `creator-10`

主流程必须始终使用该格式，不要省略前导零，不要改成其他命名方式。

#### 3.1 规划 Creator 任务

主流程负责调度：

1. 为每个 creator 生成 `scenesDataPath = {projectRoot}/scene-plans/{creatorId}.scenes.json`
2. 为每个 creator 计算：
   - `creatorId`
   - `planPath = {projectRoot}/scene-plans/{creatorId}.json`
   - `validateScript = {scriptsRoot}/validate-scene-plan.js`
3. 对每个 creator 执行：

```bash
node "{scriptsRoot}/generate-creator-scenes.js" \
  "{projectRoot}/storyboard.json" \
  "{creatorId}" \
  "{SCENES_PER_CREATOR}" \
  "{scenesDataPath}"
```

4. 主 Agent 将 `{scenesDataPath}` 的绝对路径写入 SubAgent prompt
5. 并行启动全部 creator SubAgent

#### 3.2 并行启动所有 Scene Creator

每个 Creator 的 SubAgent prompt 模板：

```text
你正在执行 srt-remotion-video 工作流的“场景规划与实现阶段”。

首先读取以下参考协议并严格按其步骤执行：
- {referencesRoot}/scene-component-creator.md

输入参数：
- skillRoot: {skillRoot}
- projectRoot: {projectRoot}
- creatorId: {creatorId}
- planPath: {planPath}
- scenesDataPath: {scenesDataPath}
- validateScript: {validateScript}

重要：
1. 所有路径都已展开为绝对路径，不要自行猜测
2. 当前 creator 的场景事实源只允许来自 {scenesDataPath}
3. 规划阶段只使用 {scenesDataPath}、{projectRoot}/cartoon-ui-style-guide.css、{projectRoot}/cartoon-ui-style-guide-reference.md 和 {skillRoot}/../remotion-best-practices/SKILL.md
4. 先生成 scene-plan JSON，再执行校验，校验通过后再编写场景组件
5. `beatPlan` 默认一段字幕对应一个 beat；如果相邻 segments 明显属于同一句连续表达，可以合并
6. 合并仅允许发生在相邻 segments 之间，禁止跳跃式组合
7. `beatPlan` 只声明 `segments` 和 `action`；实际时间必须从 scenesData[].segments 的 `relativeStart / relativeDuration` 推导
8. 场景主节奏必须绑定 scenesData[].segments[].relativeStart / relativeDuration
9. 默认保留宿主背景，在透明根层上围绕画面中部或中上区域组织主视觉；不要重建整屏背景
10. 组件接口固定为 React.FC<{ segments: Segment[] }> 且使用默认导出
11. 只负责产出 {projectRoot}/src/scenes/SceneXXX.tsx；若文件不存在则创建，若已存在则仅修改自己负责的场景文件
12. 不要手改 {projectRoot}/src/compositions/Main.tsx 或 generated-scenes.ts
13. 完成后必须按参考协议中的“完成后返回”契约，返回结构化结果
14. `remotion-best-practices` 与当前 skill 同级，固定入口为 {skillRoot}/../remotion-best-practices/SKILL.md
```

#### 3.3 等待所有 Creator 完成

确认所有目标场景组件文件均已生成。

> `componentResults` 仅用于任务完成反馈，不作为最终注册文件组装或总时长计算的真实来源。

### 步骤 4: 合成视频

#### 4.1 生成场景注册文件

普通视频生成流程不得重写 `{projectRoot}/src/compositions/Main.tsx`。

模板默认输出规格：`1920x1080 / 30fps`。

- `generated-scenes.ts` 的 `totalDurationInFrames` 由 `generate-scenes-registry.js` 生成，不要手改
- `Main.tsx` 中的 `msToFrames` 必须使用 `useVideoConfig().fps` 动态获取帧率，不能硬编码 `FPS` 常量

执行：

```bash
node "{scriptsRoot}/generate-scenes-registry.js" \
  "{projectRoot}" \
  "{projectRoot}/storyboard.json"
```

运行时契约固定：

- 每个 `SceneXXX.tsx` 都通过默认导出暴露组件
- `generated-scenes.ts` 负责保存 `start`、`duration`、`segments`、`Component`
- `Main.tsx` 负责用 `<Component segments={scene.segments} />` 把分段数据传给场景组件

#### 4.2 Root.tsx 总时长同步

`Root.tsx` 是模板只读文件，不需要也不允许在普通流程中重写。

要求：

- `Root.tsx` 必须保持从 `generated-scenes.ts` 读取 `totalDurationInFrames`
- 不要在流程中重复手算或手填总帧数

#### 4.3 校验项目产物完整性

渲染前必须执行：

```bash
node "{scriptsRoot}/validate-project.js" \
  "{projectRoot}" \
  "{projectRoot}/storyboard.json"
```

校验失败时必须停止流程，不得继续渲染。

#### 4.4 执行渲染

```bash
cd "{projectRoot}"
npx remotion render Main out/output.mp4
```

### 步骤 5: 完成

通知用户：

- 视频已生成
- 输出路径: `{projectRoot}/out/output.mp4`
- 场景数量: N
- 视频时长: X 秒

## 测试模式与重新渲染

当主视频生成流程（步骤 0–5）完成后，用户可以请求"测试模式"或"重新渲染"。

> 这两个操作都假定 `projectRoot` 已存在且场景组件已生成完毕。

### 测试模式

当用户说"测试模式"、"预览模式"或类似表述，并要求添加音频时执行。

#### TM.0 获取音频文件

1. 如果用户已提供音频文件路径，验证文件存在并解析为绝对路径 `audioPath`
2. 如果用户未提供音频文件路径，必须向用户询问
3. 验证文件存在，若不存在则反馈用户并停止

#### TM.1 添加音频到时间轴

1. 确保 `{projectRoot}/public/` 目录存在
2. 将音频文件复制为 `{projectRoot}/public/audio.mp3`

```bash
mkdir -p "{projectRoot}/public"
cp "{audioPath}" "{projectRoot}/public/audio.mp3"
```

3. 修改 `{projectRoot}/src/compositions/Main.tsx`：
   - 在 import 行添加 `Audio` 和 `staticFile`：
     ```typescript
     import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
     ```
   - 在 `<AbsoluteFill style={{ backgroundColor: ... }}>` 的直接子级最前面添加：
     ```tsx
     <Audio src={staticFile("audio.mp3")} />
     ```

4. 启动 Remotion Studio 供用户预览：

```bash
cd "{projectRoot}"
npx remotion studio
```

#### TM.2 完成通知

告知用户 Remotion Studio 已启动，音频已添加到时间轴，可在浏览器中预览。

### 重新渲染

当用户说"重新渲染"、"再次渲染"或类似表述时执行。

#### RR.0 移除时间轴上的音频

渲染最终视频前，必须确保 `Main.tsx` 中不存在音频组件：

1. 读取 `{projectRoot}/src/compositions/Main.tsx`
2. 检查是否包含 `<Audio` 标签
3. 如果存在：
   - 移除 `<Audio src={staticFile("audio.mp3")} />` 这一行
   - 从 import 语句中移除 `Audio` 和 `staticFile`（如果它们不再被其他代码使用）
4. 如果不存在，跳过此步骤

#### RR.1 执行渲染

```bash
cd "{projectRoot}"
npx remotion render Main out/output.mp4
```

#### RR.2 完成通知

通知用户视频已重新渲染，输出路径为 `{projectRoot}/out/output.mp4`。

## 高分辨率 / 高帧率渲染

当主视频生成流程已经完成，用户要求生成 4K、60fps 或其他高于默认配置（1080p 30fps）的版本时执行。

> 这个操作假定 `projectRoot` 已存在且场景组件已生成完毕。

### 关键原则：设计分辨率与输出分辨率分离

场景组件中的所有元素（卡片、图标、文字等）使用**绝对像素值**，基于 1920x1080 设计。**直接将 Root.tsx 的 width/height 改为 3840x2160 会导致所有元素在画面中占比缩小**。正确做法是**保持设计分辨率 1920x1080 不变**，通过 Remotion 的 `--scale` 参数放大输出分辨率。

### 常见错误（禁止使用）

| 错误做法 | 后果 |
|---------|------|
| 改 Root.tsx 的 width=3840 height=2160 | 所有场景元素占比缩小一半 |
| 用 `--width 3840 --height 2160` CLI 参数 | 同上 |
| 只改 fps 不改 totalDurationInFrames | 视频只有前半段有内容，后半段空白 |
| Main.tsx 中硬编码 `const FPS = 30` | 改了 Root.tsx fps 后场景时序错乱 |

### HR.0 确认用户需求

解析用户需求为具体的输出参数：

| 用户需求 | Root.tsx 修改 | generated-scenes.ts 修改 | 渲染命令 |
|---------|-------------|------------------------|---------|
| 4K / 超清 | 不改 | 不改 | `--scale 2` |
| 60fps | `fps={60}` | `totalDurationInFrames` 按比例换算 | 无需 scale |
| 4K 60fps | `fps={60}` | `totalDurationInFrames` 按比例换算 | `--scale 2` |

### HR.1 修改帧率（仅当用户要求高帧率时）

1. 修改 `{projectRoot}/src/Root.tsx` 中的 `fps` 值：

```typescript
fps={60}  // 从 30 改为 60
```

2. 修改 `{projectRoot}/src/compositions/generated-scenes.ts` 中的 `totalDurationInFrames`：

```typescript
// 帧数 = 原帧数 × (新fps / 原fps)
// 例如 30→60fps: 1572 × 2 = 3144
export const totalDurationInFrames = {原帧数 × 新fps / 原fps};
```

**关键**：`{projectRoot}/src/Root.tsx` 中 `<Composition>` 的 `width` 和 `height` **不要修改**，必须保持 `1920` 和 `1080`。分辨率放大由渲染时的 `--scale` 参数完成，而非修改设计分辨率。

> `Main.tsx` 中的 `msToFrames` 必须使用 `useVideoConfig().fps` 动态获取帧率。如果发现 `Main.tsx` 中有硬编码的 `FPS` 常量，必须先修复为 `useVideoConfig().fps`，否则 fps 变更后场景时序会完全错乱。

### HR.2 校验项目

```bash
node "{scriptsRoot}/validate-project.js" \
  "{projectRoot}" \
  "{projectRoot}/storyboard.json"
```

校验失败时必须停止，不得继续渲染。

### HR.3 执行渲染

```bash
cd "{projectRoot}"
npx remotion render Main out/output-4k.mp4 --scale 2
```

- `--scale 2`：将 1920x1080 的设计画布放大 2 倍渲染为 3840x2160
- 矢量元素（文字、SVG）会以更高分辨率渲染，画质更清晰
- 画面布局与 1080p 完全一致，不存在元素缩小的问题
- 如果不需要 4K 只需 60fps，去掉 `--scale 2` 即可

### HR.4 完成通知

通知用户：

- 输出路径: `{projectRoot}/out/output-4k.mp4`
- 输出分辨率、帧率、时长
- 如有 fps 修改，提醒用户 Root.tsx 中的 fps 已从 30 改为目标值

## 数据结构参考

### storyboard.json

```typescript
interface Storyboard {
  totalDuration: number;
  sceneCount: number;
  scenes: {
    id: string;
    startTime: number;
    duration: number;
    segments: {
      text: string;
      relativeStart: number;
      relativeDuration: number;
    }[];
    semanticTags?: string[];
    visualHint?: string;
  }[];
}
```

### scene-plan JSON

```typescript
interface ScenePlanCard {
  sceneId: string;
  goal: string;
  layout: string;
  visualCore: string;
  surface: string;
  emphasis: string;
  screenShouldShow: string[];
  beatPlan: {
    segments: number[];
    action: string;
  }[];
}
```

### SceneComponentResult

```typescript
interface SceneComponentResult {
  sceneId: string;
  componentPath: string;
  componentName?: string;
  planPath?: string;
}
```

## Resources

### template/

- 轻量模板项目，随 skill 一起分发
- 首次使用时在模板目录执行依赖安装，后续项目复用模板依赖

### references/

- `storyboard-parser.md`：分镜生成阶段协议
- `scene-component-creator.md`：场景规划与实现阶段协议

### scripts/

- `ensure-template-deps.js`：检查模板依赖，必要时执行首次安装
- `init-project.js`：根据 `srtPath` 初始化项目
- `generate-storyboard.js`：根据 SRT 和 groups.json 生成 storyboard.json
- `generate-creator-scenes.js`：根据 storyboard.json 为指定 creator 生成 scenesData JSON
- `generate-scenes-registry.js`：生成 `generated-scenes.ts`
- `scene-registry-utils.js`：registry 和校验共用工具
- `validate-project.js`：渲染前完整性校验
- `validate-scene-plan.js`：校验 scene-plan JSON 结构与 segment 绑定

## 执行清单

### 主流程

- [ ] 获取用户提供的 SRT 绝对路径
- [ ] 运行 `ensure-template-deps.js` 检查模板依赖，必要时完成首次安装
- [ ] 运行 `init-project.js --srt-path` 创建项目
- [ ] 获取 `projectRoot`、`skillRoot`、`templateRoot`、`referencesRoot`、`scriptsRoot`
- [ ] 使用 `references/storyboard-parser.md` 生成 `storyboard.json`
- [ ] 验证 `storyboard.json` 结构正确
- [ ] 计算 Creator 分组
- [ ] 使用 `references/scene-component-creator.md` 并行生成 scene-plan 与场景组件
- [ ] 运行 `generate-scenes-registry.js`
- [ ] 运行 `validate-project.js`
- [ ] 执行渲染

### 测试模式

- [ ] 获取用户提供的音频文件绝对路径
- [ ] 复制音频到 `{projectRoot}/public/audio.mp3`
- [ ] 修改 `Main.tsx` 添加 `<Audio>` 组件
- [ ] 启动 Remotion Studio 供用户预览

### 重新渲染

- [ ] 检查 `Main.tsx` 是否存在 `<Audio>` 标签
- [ ] 若存在则移除 `<Audio>` 及相关 import
- [ ] 执行渲染

### 高分辨率 / 高帧率渲染

- [ ] 解析用户需求为具体的输出分辨率、帧率和 scale 值
- [ ] 确认 `Main.tsx` 中 `msToFrames` 使用 `useVideoConfig().fps` 而非硬编码常量
- [ ] 仅当需要高帧率时：修改 `Root.tsx` 的 `fps` 和 `generated-scenes.ts` 的 `totalDurationInFrames`
- [ ] 确认 `Root.tsx` 的 `width`/`height` 保持 1920/1080 不变
- [ ] 运行 `validate-project.js` 校验
- [ ] 使用 `--scale 2`（4K时）执行渲染

## 注意事项

1. 所有路径必须使用绝对路径
2. SubAgent prompt 中必须传入实际路径值，不能只传变量名
3. 模板资源位于 `{skillRoot}/template`
4. 模板以轻量形式分发，首次使用时必须先完成 `template/` 依赖预检
5. 默认项目目录位于 `{dirname(srtPath)}/remotion-video-projects`
6. `Main.tsx`、`Root.tsx` 属于受保护宿主层
7. 场景组件必须真实消费 `segments`
8. `validate-project.js` 失败时不得继续渲染
