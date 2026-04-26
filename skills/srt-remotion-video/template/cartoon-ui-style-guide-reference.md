# Cartoon UI Style Guide Reference

本文件提供 `cartoon-ui-style-guide.css` 的参考信息、示例和速查内容。

## 说明

- `cartoon-ui-style-guide.css` 是**规范主文件**
- 本文档是**参考文档**
- Creator 在规划阶段同时读取主文件与本文件

## 使用建议

### 宿主融合规则

本节是布局与 surface 选择策略的唯一维护入口。主流程和 Creator 协议只负责读取本文件，不重复维护具体视觉偏好。

- 默认宿主背景是米黄色 + 网格，因此主体承托面应与宿主背景融合，而不是压出一整块生硬的纯白板
- 不要把纯白或近纯白实体大底板作为唯一主体背景，尤其避免大面积 `paper-note`、`torn-paper`、`comic-panel` 直接整块铺开
- 单布局 / 单主体画面优先不要使用明显大边框容器，除黑板外默认使用无框中央舞台
- 只有小面积信息卡、术语卡、局部标签、补充纸片可以使用更接近实色的纸白
- 如果场景主要依赖图解、流程、关系或节点组合，单布局优先使用无框分层承托；`whiteboard-zone` 只作为局部元素容器或多分区子容器，不作为中央大白板

### 单布局无框舞台规则

单布局 / 单主体画面指：一个主要图解、一个中心关系图、一个图表、一组围绕中心展开的节点、一个流程主视觉，画面没有明确的左右对比、三栏分区、多张独立卡片或漫画分格。

规则：

- 单布局默认使用透明根层 + 无框中央舞台，让主体直接生长在宿主米黄色网格背景上
- 除黑板样式外，单布局不得使用明显大边框容器作为主承托，包括 `whiteboard-zone`、`sketch-border`、`sketch-border-alt`、`comic-panel`、`paper-note`、`paper-note-folded`、`torn-paper`、`main-canvas`、`wood-frame`
- 禁止在 `surface` 中写“中央白板区域”“白色大面板”“虚线白板承托”“手绘边框主舞台”“漫画粗边框舞台”等方案
- 图解、流程、关系、节点组合、图表优先通过图形本身、空间分组、轻阴影、色块、标签、编号和节奏动画建立层级
- 黑板 `chalkboard-card` / `chalkboard-enhanced` 是唯一允许作为单布局主容器的明显边框例外，但仍应作为局部主视觉，不要铺满整屏
- 边框容器可以作为元素级容器，例如小信息卡、术语卡、节点卡、局部标签、对比栏内部卡片、多分区子面板、列表项或补充纸片
- 多布局场景（左右对比、三栏并列、漫画分格、多个独立步骤卡片）可以使用边框子容器，但不要再额外套一个中央大外框

### 颜色使用优先级

- 主要操作 / 强调：`--primary-yellow`
- 成功 / 正面：`--primary-green`
- 信息 / 中性：`--primary-blue`
- 警告 / 错误：`--accent-red`
- 背景 / 内容区：`--bg-cream`, `--bg-paper`

### 字体配对建议

- 标题 + 正文：`--font-title` + `--font-body`
- 黑板场景：`--font-chalk`
- 艺术强调：`--font-accent`

### 阴影使用建议

- 卡片 / 容器：`--shadow-md`
- 按钮悬浮：`--shadow-sm` -> `--shadow-md`
- 弹窗 / 模态：`--shadow-xl`
- 黑板内凹：`--shadow-inset-chalkboard`

## 非规范示例

以下内容仅作为参考模式：

- 列表交错入场
- 黑板场景示例
- 对比卡片示例
- 纹理叠加示例
- 教学场景时序示例

### 示例 1: 列表交错入场

适合功能点、步骤项、要点清单依次出现的场景。

```html
<ul class="feature-list stagger-children stagger-md">
  <li class="feature-item seq-enter-up">功能一</li>
  <li class="feature-item seq-enter-up">功能二</li>
  <li class="feature-item seq-enter-up">功能三</li>
</ul>
```

```css
.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-xs);
  background: var(--bg-paper);
  border: var(--border-thin) solid var(--text-dark);
  border-radius: var(--radius-lg);
  font-family: var(--font-body);
}

.feature-item::before {
  content: '✓';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--primary-green);
  color: var(--text-light);
  border-radius: var(--radius-circle);
  font-size: var(--text-small);
}
```

使用建议：
- 配合 `stagger-sm` 或 `stagger-md`
- 适合信息密度中等的解释场景
- 列表不要太长，3-6 项更合适

### 示例 2: 黑板场景

适合教学说明、要点归纳、公式或结构性讲解。

```html
<div class="chalkboard-scene">
  <div class="chalkboard-card chalkboard-enhanced">
    <h1 class="text-chalk">今日要点</h1>
    <ul class="chalk-list stagger-children">
      <li>要点一</li>
      <li>要点二</li>
      <li>要点三</li>
    </ul>
  </div>
</div>
```

```css
.chalkboard-scene {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-cream);
  padding: var(--space-xl);
}

.chalk-list {
  list-style: none;
  padding: 0;
  margin: var(--space-md) 0 0 0;
}

.chalk-list li {
  font-family: var(--font-chalk);
  font-size: var(--text-large);
  color: var(--text-light);
  padding: var(--space-xs) 0;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.2);
  opacity: 0;
  animation: sequence-enter-left var(--duration-normal) var(--ease-smooth) forwards;
}

.chalk-list li::before {
  content: '→ ';
  color: var(--primary-yellow);
}
```

使用建议：
- 黑板容器适合作为局部主视觉，不建议整屏铺满
- 文字数量应控制，优先做“要点呈现”而不是大段段落
- 可与 `overlay-chalk` 或局部粉笔纹理搭配

### 示例 3: 对比卡片布局

适合展示旧方案 / 新方案、错误 / 正确、A / B 对照。

```html
<div class="comparison-container">
  <div class="comparison-card comparison-negative">
    <h3>旧方案</h3>
    <ul>...</ul>
  </div>
  <div class="comparison-vs">VS</div>
  <div class="comparison-card comparison-positive">
    <h3>新方案</h3>
    <ul>...</ul>
  </div>
</div>
```

```css
.comparison-container {
  display: flex;
  align-items: stretch;
  gap: var(--space-lg);
  padding: var(--space-xl);
}

.comparison-card {
  flex: 1;
  padding: var(--space-lg);
  border: var(--border-medium) solid var(--text-dark);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  box-shadow: var(--shadow-md);
}

.comparison-negative {
  background: #FDEDEC;
  border-color: var(--accent-red);
}

.comparison-positive {
  background: var(--deco-light-yellow);
  border-color: var(--primary-yellow);
}

.comparison-vs {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: var(--text-display);
  font-weight: var(--weight-bold);
  color: var(--text-dark);
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}
```

使用建议：
- 推荐配合 `.check-mark` / `.cross-mark`
- 每侧信息量尽量对齐，避免一侧过重
- 中间 `VS` 只在明显二元对照时使用

### 示例 4: 纹理叠加

适合给内容区增加纸张或白板氛围，而不改变全局宿主背景。

```html
<div class="textured-scene bg-grid">
  <div class="content-box vintage-paper">
    <h2>复古风格内容</h2>
  </div>
</div>
```

```css
.textured-scene {
  width: 100%;
  height: 100%;
  padding: var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-box {
  max-width: var(--max-width-md);
  padding: var(--space-xl);
}
```

使用建议：
- `bg-grid` 适合米黄色宿主背景上的局部纸张感
- `vintage-paper` 适合引用、历史背景、概念定义
- 纹理只做辅助，不要盖过主要信息
- 如果容器尺寸已经很大，优先降低白度、提升透明度或改用暖底纹理，不要再叠加纯白整面

### 示例 5: 教学场景时序模板

适合把“标题出现、内容展开、细节补充、强调出现”分阶段实现。

```tsx
const TeachingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timing = {
    sceneEnter: 0,
    titleEnter: 0.2 * fps,
    contentEnter: 0.4 * fps,
    detailsEnter: 0.6 * fps,
    stagger: 0.1 * fps,
  };

  const titleProgress = spring({
    frame: frame - timing.titleEnter,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  return (
    <AbsoluteFill style={{ background: '#FDF6E3' }}>
      <div
        style={{
          opacity: titleProgress,
          transform: `scale(${titleProgress})`,
        }}
      >
        <h1>场景标题</h1>
      </div>

      <Sequence from={timing.contentEnter}>
        <ContentArea />
      </Sequence>
    </AbsoluteFill>
  );
};
```

使用建议：
- 标题、主体、细节、强调不要同帧一起出现
- 一个教学场景通常有 3-4 个主要节奏点就够了
- 如果用字幕分段驱动，优先对齐 `segment.relativeStart`

## 快速参考

### 常用样式变量

- 背景：`--bg-cream`
- 主要文字：`--text-dark`
- 主强调：`--primary-yellow`
- 标准阴影：`--shadow-md`
- 标准节奏：`--duration-normal`

### 常用 surface

- `frameless-stage` / `transparent-stage`（单布局默认）
- `whiteboard-zone`（仅局部元素容器或多分区子容器）
- `sketch-border`
- `sticky-note`
- `vintage-paper`
- `speech-bubble`
- `ribbon-banner`
- `index-card`
- `comic-panel`（仅适合分格、对比、步骤，不适合纯白整面铺底）

### 容器类型速查表

| 容器 | 视觉特征 | 常见用途 |
|------|---------|---------|
| `frameless-stage` / `transparent-stage` | 无明显边框，直接使用宿主背景组织主视觉 | 单布局 / 单主体图解、流程、关系图、图表的默认选择 |
| `sketch-border` | 不规则手绘边框卡片 | 小面积内容容器、多分区子卡片；不用于单布局中央大承托 |
| `sketch-border-alt` | 手绘边框变体 | 小面积内容容器，适合交替使用；不用于单布局中央大承托 |
| `chalkboard-card` | 深绿底 + 粉笔字氛围 | 教学说明、公式、结构讲解 |
| `chalkboard-enhanced` | 增强黑板纹理 | 重要教学内容、重点推导 |
| `paper-note` | 暖纸面便签感，允许宿主底色轻微透出 | 备注、补充说明、旁注，不建议做整屏主底 |
| `paper-note-folded` | 带折角的暖纸片 | 提示信息、补充提醒，不建议放大成唯一主体 |
| `sticky-note` | 黄色便签纸 + 轻纹理 | 要点、记忆点、行动提示 |
| `vintage-paper` | 复古羊皮纸质感 | 引用、历史背景、定义说明 |
| `wood-frame` | 木质边框展示区 | 图片、重点展示、案例画面 |
| `speech-bubble` | 带尖角的气泡容器 | 对话、引用、观点表达 |
| `ribbon-banner` | 手绘标题条 / 丝带标题 | 标题、阶段名、章节分隔 |
| `torn-paper` | 手撕暖纸边缘 | 列表、步骤、笔记片段，不建议作为唯一大背景 |
| `stamp-badge` | 印章 / 徽章式强调 | 关键词、结论、评分、标签 |
| `whiteboard-zone` | 浅暖底虚线白板区 | 局部图解区、多分区子容器；不用于单布局中央大承托 |
| `index-card` | 顶部彩条 + 横线纹理 | 定义、术语、知识点，适合作为局部信息卡 |
| `comic-panel` | 漫画分格承托区，弱化纯白感 | 步骤演示、故事、对比，适合有明确分区时使用；不用于单布局大外框 |

### 大主体容器选择建议

- 图解 / 流程 / 架构说明：单布局优先 `frameless-stage` / `transparent-stage`，不要套 `whiteboard-zone`
- 需要纸面氛围但不想显得廉价：只在小面积信息卡或局部说明中使用 `vintage-paper`、`paper-note` 或 `index-card`
- 对比 / 分步 / 漫画式叙事：可用 `comic-panel`，但必须依赖分格、标签或局部卡片来建立层次，不要只剩一整块白底
- 当画面本身已有足够节点、标签、编号、色块和图形关系时，可以直接使用透明根层 + 局部承托，不必额外补一个大底板
- 黑板 `chalkboard-card` / `chalkboard-enhanced` 是唯一允许作为单布局明显主容器的例外

### 常用 emphasis

- `underline-marker`
- `underline-wavy`
- `hand-circle`
- `hand-circle-glow`
- `check-mark`
- `cross-mark`
