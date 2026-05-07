# Theme Template Switching Guide

当用户要求“更换主题模板”“换一套风格”“修改整体视觉调性”时，按本文档执行。

本 skill 的主题模板不是单一 CSS 文件，而是四个文件共同组成的视觉系统：

1. `template/cartoon-ui-style-guide.css`
2. `template/cartoon-ui-style-guide-reference.md`
3. `template/src/design-system.ts`
4. `template/src/compositions/Main.tsx`

更换主题时必须把这四个文件作为一个整体修改。只改颜色变量或只改参考文档，都会导致 Creator 的规划、宿主画面和实际样式不一致。

## 四个文件的职责

### `template/cartoon-ui-style-guide.css`

这是视觉规范主文件，供 Creator 规划和实现阶段读取。

应包含：

- 主题设计关键词
- 颜色、字体、阴影、间距、边框、动效等 design tokens
- 常用 surface / component class
- emphasis primitives
- 动画 helper
- 语义清晰、与新主题一致的 class 名

修改重点：

- 把视觉语言完整改成新主题
- 删除原主题的审美规则和旧主题措辞
- 不要留下“旧主题迁移”“兼容旧样式”“文件名沿用”等说明痕迹
- class 名应体现新主题语义，例如 `glass-panel`、`terminal-board`、`system-panel`
- 如果保留旧 class 名只是为了兼容，也不要在文档中引导 Creator 使用它们

### `template/cartoon-ui-style-guide-reference.md`

这是 Creator 的主题理解入口，决定后续 AI 如何构图和选择 surface。

应包含：

- 新主题的整体调性描述
- 宿主融合规则
- 单布局 / 多布局规则
- 颜色使用优先级
- 字体、阴影、发光、纹理、动效建议
- 典型规划模式
- 常用 surface 速查表
- 实现提醒

修改重点：

- 让文档像新主题原生规范，而不是“从旧主题改过来”
- 不要写“禁止使用旧主题中的某某元素”这类迁移痕迹
- 直接用正向规则表达新主题应该怎么做
- surface 表和 CSS class 名必须与 `cartoon-ui-style-guide.css` 对齐
- Creator 会优先相信这份文档，所以这里的审美约束要清晰、具体、可执行

### `template/src/design-system.ts`

这是实际宿主层使用的 design token 和装饰参数。

应包含：

- 宿主背景色
- 网格 / 纹理 / 装饰色
- 主强调色、状态色、文字色
- 宿主装饰数据，例如粒子、光束、图案、角标、纹理参数

修改重点：

- 与 CSS 中的核心 token 保持一致
- 删除与新主题无关的装饰数据
- 类型名和字段名应使用新主题语义
- 如果 `Main.tsx` 依赖这里的字段，二者必须同步修改

### `template/src/compositions/Main.tsx`

这是实际渲染的宿主画面，负责全局背景和场景挂载。

应包含：

- 与新主题一致的宿主背景
- 全局装饰层，例如网格、扫描线、光效、纹理、粒子、纸张肌理等
- `generatedScenes` 的挂载逻辑

必须保持：

- 不改变 `generatedScenes.map(...)` 的场景挂载契约
- 不改变 `<Component segments={scene.segments} />`
- 不手写场景时长逻辑替代 `generated-scenes.ts`
- 不把具体场景内容写进宿主层

修改重点：

- 宿主层应成为新主题的第一视觉信号
- 场景组件默认透明叠加在宿主层上
- 不要让宿主装饰遮挡场景主体
- 动态背景应克制，避免影响可读性

## 推荐执行流程

1. 先与用户确认新主题的样式设计

   在开始修改主题前，必须先用清晰易懂的语言向用户描述新主题的视觉方向，并等待用户确认。这个沟通的目的，是让用户确认“看起来会是什么样”，而不是让用户理解实现细节。

   沟通时应避免过于技术化，不需要说明要修改哪些文件、哪些变量、哪些组件。重点说明：

   - 整体气质：例如冷静专业、未来科技、温暖手账、极简医疗、杂志感、数据仪表盘感
   - 主色和辅助色：例如深色背景配青蓝光效、冷白底配低饱和蓝绿、暖纸色配红蓝贴纸
   - 画面元素：例如玻璃面板、细线图解、扫描线、纸张纹理、贴纸标签、数据卡片
   - 信息呈现方式：例如更像系统架构图、数据仪表盘、课堂板书、手账笔记、产品演示
   - 不希望出现的感觉：例如不要太花、不要太儿童化、不要像 PPT 模板、不要过度发光

   可以给用户一段简短确认稿，例如：

   ```text
   我建议把主题做成“深色科技风”：整体是深墨色背景，叠加细网格和轻微扫描线；主体信息用半透明玻璃面板承托，重点用青蓝电光强调，成功状态用绿色，风险状态用红色。整体会像一个克制的系统仪表盘，而不是炫光很重的赛博风。这个方向可以吗？
   ```

   用户确认后，再进入文件修改。

2. 定义新主题的设计方向

   用 3-6 个关键词描述整体调性，例如：

   - 深色科技：深墨背景、青蓝电光、玻璃信息层、扫描线、数据节点
   - 极简医学：冷白背景、低饱和蓝绿、细线图解、临床标签、柔和阴影
   - 纸质手账：暖纸底、胶带、贴纸、手写标注、轻颗粒纹理

3. 同步改 `cartoon-ui-style-guide.css`

   先改 token，再改 surface / component，再改 emphasis 和动画 helper。

4. 同步改 `cartoon-ui-style-guide-reference.md`

   把 Creator 的构图规则改成新主题原生语言。不要保留旧主题禁忌清单，也不要解释迁移过程。

5. 同步改 `design-system.ts`

   让宿主 token、装饰数据、状态色与 CSS 一致。

6. 同步改 `Main.tsx`

   把宿主背景和全局装饰改成新主题，同时保持场景挂载逻辑不变。

7. 搜索并清理主题痕迹

   根据旧主题关键词搜索，例如：

   ```bash
   rg -n "旧|兼容|沿用|手绘|纸张|白板|漫画|便签|旧主题|文件名|新语义" \
     template/cartoon-ui-style-guide.css \
     template/cartoon-ui-style-guide-reference.md
   ```

   搜索词应根据实际旧主题调整。目标是让新文档读起来像原生主题规范。

8. 运行类型检查

   ```bash
   cd "{skillRoot}/template"
   ./node_modules/.bin/tsc --noEmit
   ```

   如果依赖未安装，先按主流程运行 `ensure-template-deps.js`。

## 注意事项

- 新建项目时，`init-project.js` 会复制 `template/` 到项目目录；已经生成过的旧项目不会自动同步新主题
- 如果用户要修改某个已生成项目的主题，需要修改该项目目录里的同名文件，而不是只改 skill template
- 不建议改 `SKILL.md` 和 `scene-component-creator.md` 中的 style-guide 文件名引用，除非你同时完整更新工作流协议
- `cartoon-ui-style-guide.css` 这个文件名是工作流契约的一部分，可以保留文件名，但文件内容不应出现旧主题或迁移解释
- `Root.tsx`、`generated-scenes.ts`、`generate-scenes-registry.js` 不属于主题模板更换范围
- 不要把某个具体视频的内容、标题、字幕或业务概念写进主题模板
- 不要只写抽象审美词，要提供 Creator 可直接使用的 surface 名、颜色变量、构图模式和实现提醒
- 更换主题后，应尽量让 CSS class、reference 文档、design token、宿主画面使用同一套语义词汇

## 完成标准

更换主题模板完成后，应满足：

- 四个主题文件全部更新
- reference 文档清楚说明新主题该如何构图
- CSS 中有新主题可用的 tokens、surfaces、emphasis 和动效
- `design-system.ts` 和 `Main.tsx` 渲染的新项目宿主层符合新主题
- 旧主题的显性措辞、禁忌清单、迁移说明已清理
- `tsc --noEmit` 通过
