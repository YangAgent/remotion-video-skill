---
name: srt-remotion-video
description: SRT 字幕驱动的视频生成主流程。将 SRT 字幕文件转换为 Remotion 视频项目，自动生成分镜脚本、创建场景组件、合成最终视频。当用户需要从 SRT 字幕文件Remotion视频时使用。
---

# SRT Remotion Video - 主流程编排

将 SRT 字幕文件转换为 Remotion 视频的完整工作流。

## 工作流概览

```text
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────────────────────┐   ┌──────────┐
│ 获取 SRT │ → │ 依赖预检 │ → │ 项目初始化│ → │ 生成分镜 │ → │ SubAgent 创建场景组件   │ → │ 合成视频 │
│ 文件路径 │   │ / 首次安装│   │          │   │          │   │ ┌────────┐  ┌─────────┐│   │          │
│          │   │          │   │          │   │          │   │ │Art Dir │→ │并行编码 ││   │          │
│          │   │          │   │          │   │          │   │ │视觉策略│  │Creator ││   │          │
│          │   │          │   │          │   │          │   │ └────────┘  └─────────┘│   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └─────────────────────────┘   └──────────┘
```

## 项目目录结构

```text
<skillRoot>/
├── SKILL.md
├── template/
├── references/
│   ├── storyboard-parser.md
│   ├── art-director.md
│   └── scene-component-creator.md
└── scripts/
    ├── ensure-template-deps.js
    ├── init-project.js
    ├── generate-storyboard.js
    ├── generate-scenes-registry.js
    ├── scene-registry-utils.js
    └── validate-project.js

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
2. 如果用户给的是相对路径，主 Agent 必须先自行判断该文件是否存在，如果存在，则作为 `srtPath`
3. 如果相对路径对应的文件存在，主 Agent 必须先解析为绝对路径，再将解析后的绝对路径作为 `srtPath`
4. 如果相对路径对应的文件不存在，必须明确反馈用户路径无效，并要求提供正确路径
5. 后续所有步骤统一使用最终确认过的绝对路径 `srtPath`

### 步骤 1: 依赖预检与项目初始化

> **关键**：模板始终从 skill 内部复制，所有工作在字幕目录下的独立项目目录进行。

#### 1.0 依赖预检（首次使用时自动安装）

模板以轻量方式分发，默认不包含机器相关依赖产物。主流程在创建项目之前，必须先检查 `template/` 是否已完成依赖安装。

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

**要求**：

- 首次安装发生在 `{templateRoot}`，不是每个新项目目录
- 主流程必须等待该步骤成功后，才能继续执行下一步
- 若返回 `alreadyInstalled: true`，表示模板依赖已就绪，按现有流程继续
- 若返回 `alreadyInstalled: false`，表示已完成首次安装，后续项目可直接复用该模板依赖

#### 1.1 默认行为：创建新项目

**每次创建动画时，除非用户明确指定项目路径，否则必须根据当前时间新建项目。**

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

### 步骤 3: 使用 SubAgent 创建场景组件

> **使用两阶段调度：先生成视觉策略，再并行编码。**

读取 `storyboard.json`，获取所有场景数据。

#### 3.0 前置准备：计算分组

```typescript
const SCENES_PER_CREATOR = 5;
const sceneCount = storyboard.scenes.length;
const creatorCount = Math.ceil(sceneCount / SCENES_PER_CREATOR);
```

#### 3.1 规划 SubAgent 任务

主流程负责调度：

1. **视觉策略任务**（1 个 SubAgent）
   - 包含 `projectRoot`、完整 `storyboard`、场景分组方案
   - 使用 `{referencesRoot}/art-director.md`

2. **场景创建任务**（`creatorCount` 个 SubAgent）
   - 包含 `projectRoot`、`creatorId`、`sceneRange`、负责的场景切片
   - 使用 `{referencesRoot}/scene-component-creator.md`
   - 必须等待视觉策略任务完成后再启动

#### 3.2 启动视觉策略 SubAgent

SubAgent prompt 模板：

```text
你正在执行 srt-remotion-video 工作流的“视觉策略阶段”。

首先读取以下参考协议并严格按其步骤执行：
- {referencesRoot}/art-director.md

输入参数：
- skillRoot: {skillRoot}
- projectRoot: {projectRoot}
- scenesPerCreator: {SCENES_PER_CREATOR}

场景分组方案：
- creator-1: scene_001 - scene_005
- creator-2: scene_006 - scene_010
...

重要：
1. 所有路径都已展开为绝对路径，不要自行猜测
2. 必须读取 {projectRoot}/storyboard.json 和 {projectRoot}/cartoon-ui-style-guide.css
3. 产出文件必须写入 {projectRoot}/visual-strategy.md
4. 你只制定策略，不写组件代码
5. 完成后必须按参考协议中的“完成后返回”契约，返回结构化结果
```

等待 `visual-strategy.md` 生成完成。

#### 3.3 并行启动所有 Scene Creator

每个 Creator 的 SubAgent prompt 模板：

```text
你正在执行 srt-remotion-video 工作流的“场景实现阶段”。

首先读取以下参考协议并严格按其步骤执行：
- {referencesRoot}/scene-component-creator.md

输入参数：
- skillRoot: {skillRoot}
- projectRoot: {projectRoot}
- creatorId: {creatorName}
- sceneRange: {sceneRange}

你负责的 scenesData:
{sceneSlice 的 JSON}

重要：
1. 所有路径都已展开为绝对路径，不要自行猜测
2. 编码前先读取 {projectRoot}/visual-strategy.md
3. 编码前必须先读取 {skillRoot}/../remotion-best-practices/SKILL.md
4. 场景主节奏必须绑定 scenesData[].segments[].relativeStart
5. 组件接口固定为 React.FC<{ segments: Segment[] }> 且使用默认导出
6. 只负责产出 {projectRoot}/src/scenes/SceneXXX.tsx；若文件不存在则创建，若已存在则仅修改自己负责的场景文件
7. 不要手改 {projectRoot}/src/compositions/Main.tsx 或 generated-scenes.ts
8. 完成后必须按参考协议中的“完成后返回”契约，返回结构化结果
9. `remotion-best-practices` 与当前 skill 同级，固定入口为 {skillRoot}/../remotion-best-practices/SKILL.md
```

#### 3.4 等待所有 Creator 完成

确认所有目标场景组件文件均已生成。

> `componentResults` 仅用于任务完成反馈，不作为最终注册文件组装或总时长计算的真实来源。

### 步骤 4: 合成视频

#### 4.1 生成场景注册文件

普通视频生成流程不得重写 `{projectRoot}/src/compositions/Main.tsx`。

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

### SceneComponentResult

```typescript
interface SceneComponentResult {
  sceneId: string;
  componentPath: string;
  componentName: string;
  duration: number;
}
```

## Resources

### template/

- 轻量模板项目，随 skill 一起分发
- 首次使用时在模板目录执行依赖安装，后续项目复用模板依赖

### references/

- `storyboard-parser.md`：分镜生成阶段协议
- `art-director.md`：视觉策略阶段协议
- `scene-component-creator.md`：场景实现阶段协议

### scripts/

- `ensure-template-deps.js`：检查模板依赖，必要时执行首次安装
- `init-project.js`：根据 `srtPath` 初始化项目
- `generate-storyboard.js`：根据 SRT 和 groups.json 生成 storyboard.json
- `generate-scenes-registry.js`：生成 `generated-scenes.ts`
- `scene-registry-utils.js`：registry 和校验共用工具
- `validate-project.js`：渲染前完整性校验

## 执行清单

- [ ] 获取用户提供的 SRT 绝对路径
- [ ] 运行 `ensure-template-deps.js` 检查模板依赖，必要时完成首次安装
- [ ] 运行 `init-project.js --srt-path` 创建项目
- [ ] 获取 `projectRoot`、`skillRoot`、`templateRoot`、`referencesRoot`、`scriptsRoot`
- [ ] 使用 `references/storyboard-parser.md` 生成 `storyboard.json`
- [ ] 验证 `storyboard.json` 结构正确
- [ ] 计算 Creator 分组
- [ ] 使用 `references/art-director.md` 生成 `visual-strategy.md`
- [ ] 使用 `references/scene-component-creator.md` 并行生成场景组件
- [ ] 运行 `generate-scenes-registry.js`
- [ ] 运行 `validate-project.js`
- [ ] 执行渲染

## 注意事项

1. 所有路径必须使用绝对路径
2. SubAgent prompt 中必须传入实际路径值，不能只传变量名
3. 模板资源位于 `{skillRoot}/template`
4. 模板以轻量形式分发，首次使用时必须先完成 `template/` 依赖预检
5. 默认项目目录位于 `{dirname(srtPath)}/remotion-video-projects`
6. `Main.tsx`、`Root.tsx` 属于受保护宿主层
7. 场景组件必须真实消费 `segments`
8. `validate-project.js` 失败时不得继续渲染
