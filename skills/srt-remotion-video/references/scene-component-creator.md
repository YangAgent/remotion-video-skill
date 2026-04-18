# Scene Component Creator Reference

本文件是 `srt-remotion-video` 工作流中的“场景实现阶段”参考协议，由主 Agent 指派 SubAgent 读取并执行。

## 输入契约

- `skillRoot`: `srt-remotion-video` skill 的绝对路径
- `projectRoot`: 项目根目录绝对路径
- `creatorId`: 当前 Creator 标识
- `sceneRange`: 当前 Creator 负责的场景范围
- `scenesData`: 当前 Creator 负责的场景数据

## 必读资源

开始编码前必须读取：

1. `{projectRoot}/visual-strategy.md`
2. `{projectRoot}/cartoon-ui-style-guide.css`
3. `{skillRoot}/../remotion-best-practices/SKILL.md`

如果当前场景涉及动画编排、文本动画、时序控制、字幕、音频、资源加载、Composition 配置等 Remotion 常见问题，必须继续按需读取 `remotion-best-practices` 的相关规则文件。

**强制要求**：

- `remotion-best-practices` 与当前 skill 同级，入口文件固定为 `{skillRoot}/../remotion-best-practices/SKILL.md`
- 必须直接读取该文件，不得自行改写为其他目录
- 后续如需读取其规则文件，也必须从该同级 skill 目录继续展开

## 角色定位

你负责执行和实现，把既定策略落成代码。

你的职责：

- 读取 `visual-strategy.md`
- 读取设计系统主文件并提取所需资源
- 将策略转换为可渲染的 Remotion 场景组件
- 保持局部场景质量与全局风格一致

你不做的事：

- 不重新制定 `visual-strategy.md`
- 不维护第二份 CSS 手册
- 不重定义全局宿主层
- 不手改 `Main.tsx` 或 `generated-scenes.ts`
- 不把台词原文直接做成字幕卡片

## 核心原则

1. 先读策略，再做实现
2. CSS 主文件是唯一设计系统来源
3. 负责“怎么实现”，不是“定义规范”
4. 内容转化优先
5. 主视觉优先于容器
6. 主体必须足够大、足够近
7. 避免“组件感”

## 内容转化硬约束

- 屏幕上不得出现超过 6 个连续汉字直接取自台词原文
- 单场景可见文字中，台词原文占比不超过 50%
- 卡片主体必须是图形、结构、图解、关系，而不是完整句子
- 禁止使用 emoji 作为图标、表情提示、项目符号或装饰元素
- 如需表达情绪、提醒、状态、方向、符号语义或轻量图标，优先使用 `lucide-react`
- 若 `lucide-react` 没有合适图标，再使用 React 内联 SVG / SVG 路径自行绘制，不要回退为 emoji

编码前必须先完成内部 preflight：

```text
scene_xxx preflight
- goal:
- beatPlan:
- beatSegments:
- screenShouldShow:
- visibleText:
- originalTextRatio:
- primaryInfoCarrier: graphic / text
- redlineCheck: pass / fail
```

## 实现协议

### 1. 读取策略结果

优先使用以下字段：

1. `surface`
2. `emphasis`
3. `layout`
4. `goal`
5. `beatPlan`
6. `screenShouldShow`

时间绑定要求：

- `beatPlan` 中每个 beat 都必须提供 `segments`
- 不要自己把多个 segment 私自合并成一个 beat 再推断起始时间
- 每个 beat 的开始时间，取所绑定第一个 segment 的 `relativeStart`
- 每个 beat 的结束时间，取所绑定最后一个 segment 的 `relativeStart + relativeDuration`
- 时间推导必须来自 `scenesData[].segments`，不要引入第二套锚点字段

### 2. 读取设计系统

只提取当前实现需要的：

- 样式变量值
- surface 定义
- emphasis 定义
- texture / pattern 定义
- 宿主与背景规则
- 已安装的图标资源（优先 `lucide-react`）

### 3. 组件实现

组件文件路径：

- `{projectRoot}/src/scenes/Scene{XXX}.tsx`

实现要求：

- 组件签名：`const SceneXXX: React.FC<{ segments: Segment[] }> = ({ segments }) => { ... }`
- 场景文件统一使用 `export default SceneXXX`
- 从 `remotion` 导入并使用 `useCurrentFrame()`、`useVideoConfig()`
- 使用 `segments[]` 中的 `relativeStart` / `relativeDuration` 计算元素出现帧
- 依据 `beatPlan` 的 `segments` 绑定，把对应 segment 的时间换算成帧再绑定动画
- 主视觉默认做大一档，主体和关键关系应明显占据画面主要可视区域，不要缩成谨慎的小图标或小卡片
- 画面默认做满，建立足够的信息密度；在不增加长文案的前提下，用辅助图形、连接关系、背景承托把结构撑起来
- 强化主次层级，中心主体、辅助元素、次要装饰的尺寸和权重应拉开，不要把所有元素做得同样轻、同样小、同样分散
- 默认追求“海报感”而不是“局部组件感”；单个 scene 应先解决整屏视觉重心，再处理局部细节
- 默认围绕画面中部区域组织主视觉，除非策略明确要求偏置构图
- 优先先建立整屏构图区域，再在该区域内做局部 absolute 定位
- 多元素场景优先围绕中心轴、中心舞台或成组区域展开，不要用一组偏小的固定 `left/top` 像素直接定义整场景主布局
- 固定像素定位只用于局部微调，不应让主视觉像一个缩在角落里的小组件
- 主体尺寸与占画面比例要足够支撑整屏观看，避免主要信息只占据一小块局部区域
- 不得只依赖固定延迟模板
- 元素出现后通常保持可见，形成累积理解
- 容器只做承托，不做场景唯一主角
- 需要图标或符号时，先尝试从 `lucide-react` 选择合适图标
- 若 `lucide-react` 不适配当前语义或风格，再使用内联 SVG 实现
- 不得用 emoji 充当图标、符号、项目符号、标签或视觉装饰

### 4. 宿主层边界

- 场景组件最外层 `<AbsoluteFill>` 默认保持透明
- 不得重建全局背景
- 不得覆盖全屏宿主层
- 特殊氛围只能通过局部容器或局部浮层表达

## 输出

主要输出：

- `{projectRoot}/src/scenes/Scene{XXX}.tsx`
- 若文件不存在则创建，若已存在则仅修改当前负责的场景文件

完成反馈：

- 已实现的场景列表
- 新增或复用的实现约定

## 完成后返回

完成后必须向主 Agent 返回结构化结果，不要只回复“已完成”。

成功时返回：

```json
{
  "success": true,
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
- [ ] 读取 `visual-strategy.md`
- [ ] 读取 `cartoon-ui-style-guide.css`
- [ ] 读取 `scenesData`
- [ ] 读取 `{skillRoot}/../remotion-best-practices/SKILL.md`
- [ ] 完成每个场景的 preflight 自检
- [ ] 确认主要拍点已绑定到 `segments[]`
- [ ] 实现 Remotion 组件
- [ ] 使用默认导出
- [ ] 不修改宿主层文件
