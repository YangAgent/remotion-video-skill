# Storyboard Parser Reference

本文件是 `srt-remotion-video` 工作流中的“分镜生成阶段”参考协议，由主 Agent 指派 SubAgent 读取并执行。

## 输入契约

- `skillRoot`: `srt-remotion-video` skill 的绝对路径
- `projectRoot`: 项目根目录绝对路径
- `srtPath`: SRT 文件绝对路径

**强制要求**：

- 所有输入路径均由主 Agent 提供为绝对路径
- 不要猜测仓库根目录
- 不要使用旧 skill 路径
- 不要在工具调用中使用相对路径

## 输出

1. `{projectRoot}/groups.json`
2. `{projectRoot}/storyboard.json`
3. 返回：

```json
{
  "storyboardPath": "/path/to/storyboard.json",
  "sceneCount": 17
}
```

## 工作流程

### 步骤 1: 读取并分析 SRT 文件

使用 Read 工具读取 `srtPath`，记录字幕总条数。

### 步骤 2: 语义分组

根据以下原则将连续字幕分组为场景：

1. 语义完整性
2. 主题一致性
3. 时长控制，单场景建议包含 2-6 条字幕
4. 自然停顿
5. 节奏清晰，避免一个场景塞入多个独立拍点

强分组信号：

- 转折词
- 总结词
- 引入词
- 话题明显切换
- 从例子切到定义、从定义切到解释、从解释切到反转、从反转切到总结

弱分组信号：

- 连续列举项
- 同一句话被拆成多条字幕
- 问答对
- 同一视觉动作下的补充说明

为每个分组生成：

- `sceneId`
- `fromIndex`
- `toIndex`
- `semanticTags`
- `visualHint`

`visualHint` 必须同时说明布局方向和展开方式，例如“左右对比展开”“先主视觉出现，再补充关系线”。

### 步骤 3: 写入 groups.json

写入 `{projectRoot}/groups.json`，结构如下：

```json
{
  "groups": [
    {
      "sceneId": "scene_001",
      "fromIndex": 1,
      "toIndex": 3,
      "semanticTags": ["开场", "介绍"],
      "visualHint": "大标题居中，逐段揭示主题图标"
    }
  ]
}
```

### 步骤 4: 验证分组连续性

必须验证：

1. 第一组 `fromIndex === 1`
2. 每组 `fromIndex === 上一组.toIndex + 1`
3. 最后一组 `toIndex === SRT 总条数`
4. `sceneId` 连续递增：`scene_001`, `scene_002`, ...

如失败，修正 `groups.json` 后重新验证。

### 步骤 5: 运行脚本生成 storyboard.json

执行：

```bash
node "{skillRoot}/scripts/generate-storyboard.js" \
  "{srtPath}" \
  "{projectRoot}/groups.json" \
  "{projectRoot}/storyboard.json"
```

脚本负责：

1. 解析 SRT 时间信息
2. 校验 `groups.json`
3. 计算 `startTime`、`duration`
4. 计算 `segments[].relativeStart`、`segments[].relativeDuration`
5. 生成 `storyboard.json`

## 完成后返回

完成后必须向主 Agent 返回结构化结果，不要只回复“已完成”。

成功时返回：

```json
{
  "success": true,
  "storyboardPath": "{projectRoot}/storyboard.json",
  "groupsPath": "{projectRoot}/groups.json",
  "sceneCount": 17
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

- [ ] 确认 `skillRoot`、`projectRoot`、`srtPath` 都是绝对路径
- [ ] 读取 SRT 并记录总条数
- [ ] 语义分组
- [ ] 生成 `groups.json`
- [ ] 验证连续性
- [ ] 执行 `generate-storyboard.js`
- [ ] 返回结构化结果
