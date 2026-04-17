# Cartoon UI Style Guide Reference

本文件提供 `cartoon-ui-style-guide.css` 的参考信息、示例和速查内容。

## 说明

- `cartoon-ui-style-guide.css` 是**规范主文件**
- 本文档是**参考文档**
- Skill 在默认情况下应优先读取主文件；只有需要示例时再读取本文件

## 使用建议

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

- `sketch-border`
- `sticky-note`
- `vintage-paper`
- `speech-bubble`
- `ribbon-banner`
- `whiteboard-zone`
- `index-card`
- `comic-panel`

### 容器类型速查表

| 容器 | 视觉特征 | 常见用途 |
|------|---------|---------|
| `sketch-border` | 不规则手绘边框卡片 | 通用内容容器 |
| `sketch-border-alt` | 手绘边框变体 | 通用内容容器，适合交替使用 |
| `chalkboard-card` | 深绿底 + 粉笔字氛围 | 教学说明、公式、结构讲解 |
| `chalkboard-enhanced` | 增强黑板纹理 | 重要教学内容、重点推导 |
| `paper-note` | 手写纸张便签感 | 备注、补充说明、旁注 |
| `paper-note-folded` | 带折角的纸张 | 提示信息、补充提醒 |
| `sticky-note` | 黄色便签纸 + 轻纹理 | 要点、记忆点、行动提示 |
| `vintage-paper` | 复古羊皮纸质感 | 引用、历史背景、定义说明 |
| `wood-frame` | 木质边框展示区 | 图片、重点展示、案例画面 |
| `speech-bubble` | 带尖角的气泡容器 | 对话、引用、观点表达 |
| `ribbon-banner` | 手绘标题条 / 丝带标题 | 标题、阶段名、章节分隔 |
| `torn-paper` | 手撕纸边缘 | 列表、步骤、笔记片段 |
| `stamp-badge` | 印章 / 徽章式强调 | 关键词、结论、评分、标签 |
| `whiteboard-zone` | 浅底虚线白板区 | 图解、架构说明、关系图 |
| `index-card` | 顶部彩条 + 横线纹理 | 定义、术语、知识点 |
| `comic-panel` | 粗边漫画分格 | 步骤演示、故事、对比 |

### 常用 emphasis

- `underline-marker`
- `underline-wavy`
- `hand-circle`
- `hand-circle-glow`
- `check-mark`
- `cross-mark`
