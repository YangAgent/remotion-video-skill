# Scene Component Creator Reference

本文件是 `srt-remotion-video` 工作流中的“场景规划与实现阶段”参考协议，由主 Agent 指派 SubAgent 读取并执行。

## 输入契约

- `skillRoot`: `srt-remotion-video` skill 的绝对路径
- `projectRoot`: 项目根目录绝对路径
- `creatorId`: 当前 Creator 标识
- `planPath`: 当前 Creator 的 scene-plan 输出路径
- `scenesDataPath`: 当前 Creator 的 scenesData 落盘路径
- `validateScript`: `validate-scene-plan.js` 的绝对路径

## 必读资源

开始前必须读取：

1. `{scenesDataPath}`
2. `{projectRoot}/cartoon-ui-style-guide.css`
3. `{projectRoot}/cartoon-ui-style-guide-reference.md`
4. `{skillRoot}/../remotion-best-practices/SKILL.md`

如果当前场景涉及动画编排、文本动画、时序控制、字幕、音频、资源加载、Composition 配置等 Remotion 常见问题，必须继续按需读取 `remotion-best-practices` 的相关规则文件。

**强制要求**：

- `remotion-best-practices` 与当前 skill 同级，入口文件固定为 `{skillRoot}/../remotion-best-practices/SKILL.md`
- 必须直接读取该文件，不得自行改写为其他目录
- 后续如需读取其规则文件，也必须从该同级 skill 目录继续展开

## 角色定位

你负责完成局部 scene slice 的规划、校验和实现。

你的职责：

- 以 `{scenesDataPath}` 为准读取当前 creator 的本地 scenesData
- 读取设计系统主文件和参考文档并提取所需资源
- 先生成结构化 `scene-plan`
- 运行校验脚本确认 `scene-plan` 合法
- 将通过校验的 plan 落成可渲染的 Remotion 场景组件
- 保持局部场景质量与全局风格一致

你不做的事：

- 不读取完整 `storyboard.json`
- 不维护第二份 CSS 手册
- 不重定义全局宿主层
- 不手改 `Main.tsx` 或 `generated-scenes.ts`
- 不把台词原文直接做成字幕卡片

## 核心原则

1. 先规划，再校验，再实现
2. CSS 主文件和参考文档是设计输入源
3. 负责“为当前场景做出可执行方案”，不是输出全局分析报告
4. 内容转化优先
5. 主视觉优先于容器
6. 主体必须足够大、足够近
7. 避免“组件感”

## 设计画布规范

所有场景组件统一按 `1920x1080` 设计画布实现。

- 构图、绝对定位、SVG `viewBox`、路径坐标、装饰坐标都按 `1920x1080` 设计画布组织
- 可以使用 `1920` / `1080` 作为设计坐标、SVG viewBox 或局部绘图坐标
- 若使用 SVG，优先写 `viewBox="0 0 1920 1080"`，外层用 `width="100%" height="100%"`
- `useVideoConfig()` 只用于读取 `fps` 做时间换算；不要用 Composition 的 `width` / `height` 推导布局
- 禁止写死 `30fps`；时间换算必须使用 `useVideoConfig().fps`
- 若需要画布常量，使用 `const DESIGN_WIDTH = 1920`、`const DESIGN_HEIGHT = 1080`

## 概念模型

- `scenesData`
  当前 creator 负责的场景事实数据。它是唯一事实源。
- `segments`
  单个 scene 中的字幕分段数组。它是 beat 切分和时序推导的原子单位。
- `scene-plan`
  当前 creator 基于 `scenesData` 生成的结构化规划文件。它是代码实现前的唯一规划产物，也是静态校验输入。

## 关系约束

- `scene-plan` 只描述当前 `scenesData` 中的 scenes
- `scene-plan` 中每个对象只对应一个 `sceneId`
- `sceneId` 必须与 `scenesData[].id` 一一对应
- `beatPlan` 只组织当前 scene 的 `segments`
- 代码实现阶段只读取 `scene-plan` 和 `scenesData`
- 未通过校验前，不得开始编写场景组件

## 内容转化约束

- 先判断观众最需要看见的关系，再决定哪些词需要上屏
- 优先用图形、结构、图解、关系、动作、对比、流程、空间分布、比喻物表达内容
- 可以保留少量短词、短标签、数字、关键词，作为视觉锚点
- 长句默认不直接上屏；必要概念名或收束锚点可以保留为短文本
- `screenShouldShow` 描述最终画面中的图形关系、标签体系、构图重心，不写成长句排版稿
- `beatPlan.action` 描述画面推进，不写“原句整句出现”“逐字显示原文”之类的动作

## 文本与图标硬约束

- 屏幕上不得出现超过 6 个连续汉字直接取自台词原文
- 单场景可见文字中，台词原文占比不超过 50%
- 卡片主体必须是图形、结构、图解、关系，而不是完整句子
- 禁止使用 emoji 作为图标、表情提示、项目符号或装饰元素
- 如需表达情绪、提醒、状态、方向、符号语义或轻量图标，优先使用 `lucide-react`
- 若 `lucide-react` 没有合适图标，再使用 React 内联 SVG / SVG 路径自行绘制

## Scene Planning

### 1. 规划输出

`{scenesDataPath}` 是当前 creator 的本地真值源。该文件由主流程脚本生成。

再生成 `{planPath}`，文件内容必须是 JSON 数组。每个元素对应一个 scene card：

```json
[
  {
    "sceneId": "scene_001",
    "goal": "说明这一段要让观众理解的关系与画面目标",
    "layout": "描述主要构图方式",
    "visualCore": "描述主视觉关系或信息承载物",
    "surface": "描述局部承托材质或主容器",
    "emphasis": "描述强调层级或强调手法",
    "screenShouldShow": [
      "描述观众最终看到的图形关系",
      "描述画面中的标签体系或关键词锚点"
    ],
    "beatPlan": [
      {
        "segments": [0],
        "action": "描述这一拍的视觉推进"
      },
      {
        "segments": [1, 2],
        "action": "描述连续句式合并后的视觉推进"
      }
    ]
  }
]
```

字段说明：

- `sceneId`
  当前规划对象对应的场景 ID，必须与 `scenesData` 中某个 scene 的 `id` 完全一致。
- `goal`
  这一场要让观众理解什么关系，以及为什么用当前画面方案。
- `layout`
  这一场的主要构图方式和主视觉组织方式。
- `visualCore`
  当前 scene 的主视觉载体或核心关系，不写成一句台词。
- `surface`
  当前 scene 使用的局部承托材质或主容器，不作为整屏背景。
- `emphasis`
  当前 scene 的强调层级或主要强调手法。
- `screenShouldShow`
  观众最终会看到的图形关系、标签体系、关键词锚点和构图重心。
- `beatPlan`
  当前 scene 的分拍方案。每一项只声明“哪些 `segments` 组成这一拍”和“这一拍发生什么视觉推进”，不引入第二套时间锚点。

### 2. beatPlan 规则

- 默认每个 segment 对应一个 beat
- 如果相邻 segments 明显属于同一句连续表达，可以合并为一个 beat
- 合并仅允许发生在相邻 segments 之间
- 禁止跳跃式组合，例如 `[0, 2]`
- 单个 scene 的全部 segment 必须被完整覆盖且只覆盖一次
- `beatPlan` 只声明 `segments` 和 `action`
- 不写帧数、毫秒数、绝对时间或第二套锚点字段

### 3. planning preflight

每个 scene 在写代码前必须先完成内部自检：

```text
scene_xxx planning preflight
- goal:
- beatPlan:
- beatSegments:
- screenShouldShow:
- visibleText:
- originalTextRatio:
- primaryInfoCarrier: graphic / text
- redlineCheck: pass / fail
```

## Scene Plan 校验

生成 `{planPath}` 后，必须执行：

```bash
node "{validateScript}" \
  "{planPath}" \
  "{scenesDataPath}"
```

执行要求：

- 校验失败时，先修正 plan，再重新执行校验
- 只有校验通过后，才允许开始写 `SceneXXX.tsx`
- 不要跳过校验步骤

## Scene Implementation

### 1. 读取已通过校验的规划结果

实现时优先使用以下字段：

1. `surface`
2. `emphasis`
3. `layout`
4. `goal`
5. `beatPlan`
6. `screenShouldShow`

实现时的读取方式：

- 从 `scenesData` 读取事实和时间
- 从 `scene-plan` 读取视觉组织和分拍方案
- 不要把 `scene-plan` 当作新的字幕源或时间源

### 2. 时间绑定要求

- 每个 beat 的时间都从 `scenesData[].segments` 推导
- 每个 beat 的开始时间，取所绑定第一个 segment 的 `relativeStart`
- 每个 beat 的结束时间，取所绑定最后一个 segment 的 `relativeStart + relativeDuration`
- 不要自己发明第二套时间锚点

### 3. 读取设计系统

只提取当前实现需要的：

- 样式变量值
- surface 定义
- emphasis 定义
- texture / pattern 定义
- 宿主与背景规则
- 已安装的图标资源

### 4. 组件实现

组件文件路径：

- `{projectRoot}/src/scenes/Scene{XXX}.tsx`

实现要求：

- 组件签名：`const SceneXXX: React.FC<{ segments: Segment[] }> = ({ segments }) => { ... }`
- 场景文件统一使用 `export default SceneXXX`
- 从 `remotion` 导入并使用 `useCurrentFrame()`、`useVideoConfig()`
- 从 `useVideoConfig()` 中优先只读取 `fps`；布局不要依赖 Composition 的 `width` / `height`
- 使用 `segments[]` 中的 `relativeStart` / `relativeDuration` 计算元素出现帧
- 依据 `beatPlan` 的 `segments` 绑定，把对应 segment 的时间换算成帧再绑定动画
- scene 的构图和固定坐标必须按 `1920x1080` 设计画布组织
- 主视觉默认做大一档，主体和关键关系应明显占据画面主要可视区域
- 画面默认做满，建立足够的信息密度；在不增加长文案的前提下，用辅助图形、连接关系、背景承托把结构撑起来
- 强化主次层级，中心主体、辅助元素、次要装饰的尺寸和权重应拉开
- 默认追求“海报感”而不是“局部组件感”
- 默认围绕画面中部区域组织主视觉，除非策略明确要求偏置构图
- 优先先建立整屏构图区域，再在该区域内做局部 absolute 定位
- 多元素场景优先围绕中心轴、中心舞台或成组区域展开
- 固定像素定位只用于局部微调
- 元素出现后通常保持可见，形成累积理解
- 容器只做承托，不做场景唯一主角
- 需要图标或符号时，先尝试从 `lucide-react` 选择合适图标
- 若 `lucide-react` 不适配当前语义或风格，再使用内联 SVG 实现

### 5. 宿主层边界

- 场景组件最外层 `<AbsoluteFill>` 必须保持透明
- 不得重建或覆盖整屏宿主背景
- `surface` 只能落在局部容器、局部面板或中央舞台，不得作为整屏底图
- 特殊氛围也只能通过局部承托区表达

## 输出

主要输出：

- `{planPath}`
- `{scenesDataPath}`
- `{projectRoot}/src/scenes/Scene{XXX}.tsx`

完成反馈：

- 已实现的场景列表
- scene-plan 输出路径
- 新增或复用的实现约定

## 完成后返回

完成后必须向主 Agent 返回结构化结果，不要只回复“已完成”。

成功时返回：

```json
{
  "success": true,
  "planPath": "{projectRoot}/scene-plans/creator-1.json",
  "implementedScenes": [
    {
      "sceneId": "scene_001",
      "componentPath": "{projectRoot}/src/scenes/Scene001.tsx"
    }
  ]
}
```

失败时返回：

```json
{
  "success": false,
  "error": "失败原因"
}
```

## 执行清单

- [ ] 确认 `projectRoot` 是绝对路径
- [ ] 读取 `{scenesDataPath}`，作为`{scenesData}`
- [ ] 读取 `cartoon-ui-style-guide.css`
- [ ] 读取 `cartoon-ui-style-guide-reference.md`
- [ ] 读取 `{skillRoot}/../remotion-best-practices/SKILL.md`
- [ ] 生成 `{planPath}`
- [ ] 执行 scene-plan 校验
- [ ] 完成每个场景的 preflight 自检
- [ ] 确认主要拍点已绑定到 `segments[]`
- [ ] 实现 Remotion 组件
- [ ] 使用默认导出
- [ ] 不修改宿主层文件
