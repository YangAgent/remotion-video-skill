#!/usr/bin/env node

/**
 * generate-storyboard.js
 *
 * 根据 SRT 文件和 AI 生成的分组信息，生成 storyboard.json
 *
 * 用法: node generate-storyboard.js <srtPath> <groupsPath> <outputPath>
 *
 * 输入:
 *   - srtPath: SRT 字幕文件路径
 *   - groupsPath: AI 生成的 groups.json 路径
 *   - outputPath: 输出的 storyboard.json 路径
 *
 * groups.json 格式:
 * {
 *   "groups": [
 *     {
 *       "sceneId": "scene_001",
 *       "fromIndex": 1,
 *       "toIndex": 3,
 *       "semanticTags": ["开场", "介绍"],
 *       "visualHint": "大标题居中，配合动画演示稿相关图标"
 *     },
 *     ...
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');

// ============ SRT 解析 ============

/**
 * 解析时间码为毫秒
 * @param {string} timeStr - 格式: "HH:MM:SS,mmm"
 * @returns {number} 毫秒数
 */
function parseTimeCode(timeStr) {
  const match = timeStr.trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) {
    throw new Error(`无效的时间码格式: ${timeStr}`);
  }
  const [, hours, minutes, seconds, ms] = match;
  return (
    parseInt(hours, 10) * 3600000 +
    parseInt(minutes, 10) * 60000 +
    parseInt(seconds, 10) * 1000 +
    parseInt(ms, 10)
  );
}

/**
 * 解析 SRT 文件
 * @param {string} srtContent - SRT 文件内容
 * @returns {Array<{index: number, startMs: number, endMs: number, text: string}>}
 */
function parseSRT(srtContent) {
  const subtitles = [];

  // 按空行分割为块
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    // 第一行: 序号
    const index = parseInt(lines[0].trim(), 10);
    if (isNaN(index)) continue;

    // 第二行: 时间码
    const timeLine = lines[1].trim();
    const timeMatch = timeLine.match(/(.+?)\s*-->\s*(.+)/);
    if (!timeMatch) continue;

    const startMs = parseTimeCode(timeMatch[1]);
    const endMs = parseTimeCode(timeMatch[2]);

    // 第三行及以后: 文本
    const text = lines.slice(2).join('\n').trim();

    subtitles.push({ index, startMs, endMs, text });
  }

  // 按序号排序
  subtitles.sort((a, b) => a.index - b.index);

  return subtitles;
}

// ============ 分组验证 ============

/**
 * 验证分组数据的完整性和连续性
 * @param {Array} groups - 分组数组
 * @param {number} totalSubtitles - SRT 字幕总数
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateGroups(groups, totalSubtitles) {
  const errors = [];

  if (!groups || groups.length === 0) {
    errors.push('分组数据为空');
    return { valid: false, errors };
  }

  // 检查第一个分组的 fromIndex 是否为 1
  if (groups[0].fromIndex !== 1) {
    errors.push(`第一个分组的 fromIndex 必须为 1，实际为 ${groups[0].fromIndex}`);
  }

  // 检查最后一个分组的 toIndex 是否等于字幕总数
  const lastGroup = groups[groups.length - 1];
  if (lastGroup.toIndex !== totalSubtitles) {
    errors.push(`最后一个分组的 toIndex 必须为 ${totalSubtitles}，实际为 ${lastGroup.toIndex}`);
  }

  // 检查连续性和 sceneId 格式
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const expectedSceneId = `scene_${String(i + 1).padStart(3, '0')}`;

    // 检查 sceneId 格式
    if (group.sceneId !== expectedSceneId) {
      errors.push(`分组 ${i + 1} 的 sceneId 应为 ${expectedSceneId}，实际为 ${group.sceneId}`);
    }

    // 检查 fromIndex <= toIndex
    if (group.fromIndex > group.toIndex) {
      errors.push(`分组 ${group.sceneId} 的 fromIndex (${group.fromIndex}) 大于 toIndex (${group.toIndex})`);
    }

    // 检查与前一个分组的连续性
    if (i > 0) {
      const prevGroup = groups[i - 1];
      if (group.fromIndex !== prevGroup.toIndex + 1) {
        errors.push(`分组 ${group.sceneId} 的 fromIndex (${group.fromIndex}) 与前一个分组的 toIndex (${prevGroup.toIndex}) 不连续`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============ 生成 Storyboard ============

/**
 * 根据分组信息生成场景
 * @param {Array} subtitles - 解析后的字幕数组
 * @param {Array} groups - 分组数组
 * @returns {Array} 场景数组
 */
function generateScenes(subtitles, groups) {
  const scenes = [];

  // 创建字幕索引映射 (index -> subtitle)
  const subtitleMap = new Map();
  for (const sub of subtitles) {
    subtitleMap.set(sub.index, sub);
  }

  for (const group of groups) {
    // 获取该分组内的所有字幕
    const groupSubtitles = [];
    for (let idx = group.fromIndex; idx <= group.toIndex; idx++) {
      const sub = subtitleMap.get(idx);
      if (sub) {
        groupSubtitles.push(sub);
      }
    }

    if (groupSubtitles.length === 0) {
      console.warn(`警告: 分组 ${group.sceneId} 没有找到对应的字幕`);
      continue;
    }

    // 计算场景的 startTime (第一条字幕的开始时间)
    const startTime = groupSubtitles[0].startMs;

    // 生成 segments，计算相对时间
    const segments = groupSubtitles.map((sub, idx) => {
      // relativeStart: 相对于场景开始的时间
      // 第一个 segment 的 relativeStart 必须为 0
      const relativeStart = idx === 0 ? 0 : sub.startMs - startTime;

      // relativeDuration: 该字幕的持续时间
      const relativeDuration = sub.endMs - sub.startMs;

      return {
        text: sub.text,
        relativeStart,
        relativeDuration
      };
    });

    // 计算场景的 duration (最后一个 segment 的 relativeStart + relativeDuration)
    const lastSegment = segments[segments.length - 1];
    const duration = lastSegment.relativeStart + lastSegment.relativeDuration;

    const scene = {
      id: group.sceneId,
      startTime,
      duration,
      segments
    };

    // 添加可选字段
    if (group.semanticTags && group.semanticTags.length > 0) {
      scene.semanticTags = group.semanticTags;
    }
    if (group.visualHint) {
      scene.visualHint = group.visualHint;
    }

    scenes.push(scene);
  }

  return scenes;
}

/**
 * 生成完整的 storyboard 数据
 * @param {Array} scenes - 场景数组
 * @returns {Object} storyboard 对象
 */
function generateStoryboard(scenes) {
  if (scenes.length === 0) {
    return {
      totalDuration: 0,
      sceneCount: 0,
      scenes: []
    };
  }

  const lastScene = scenes[scenes.length - 1];
  const totalDuration = lastScene.startTime + lastScene.duration;

  return {
    totalDuration,
    sceneCount: scenes.length,
    scenes
  };
}

function validateGeneratedScenes(storyboard) {
  const errors = [];
  const scenes = storyboard.scenes;

  if (storyboard.sceneCount !== scenes.length) {
    errors.push(`sceneCount 应为 ${scenes.length}，实际为 ${storyboard.sceneCount}`);
  }

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const expectedId = `scene_${String(i + 1).padStart(3, '0')}`;

    if (scene.id !== expectedId) {
      errors.push(`场景 ${i + 1} 的 id 应为 ${expectedId}，实际为 ${scene.id}`);
    }

    if (!Array.isArray(scene.segments) || scene.segments.length === 0) {
      errors.push(`场景 ${scene.id} 缺少 segments`);
      continue;
    }

    if (typeof scene.startTime !== 'number' || scene.startTime < 0) {
      errors.push(`场景 ${scene.id} 的 startTime 无效: ${scene.startTime}`);
    }

    if (typeof scene.duration !== 'number' || scene.duration <= 0) {
      errors.push(`场景 ${scene.id} 的 duration 无效: ${scene.duration}`);
    }

    let computedDuration = 0;
    let previousStart = -1;
    for (let j = 0; j < scene.segments.length; j++) {
      const segment = scene.segments[j];
      if (typeof segment.relativeStart !== 'number' || segment.relativeStart < 0) {
        errors.push(`场景 ${scene.id} 的 segment[${j}] relativeStart 无效`);
      }
      if (typeof segment.relativeDuration !== 'number' || segment.relativeDuration <= 0) {
        errors.push(`场景 ${scene.id} 的 segment[${j}] relativeDuration 无效`);
      }
      if (segment.relativeStart < previousStart) {
        errors.push(`场景 ${scene.id} 的 segments 时间未递增`);
      }
      previousStart = segment.relativeStart;
      computedDuration = Math.max(
        computedDuration,
        segment.relativeStart + segment.relativeDuration,
      );
    }

    if (computedDuration !== scene.duration) {
      errors.push(`场景 ${scene.id} 的 duration 应为 ${computedDuration}，实际为 ${scene.duration}`);
    }

    if (i > 0) {
      const prev = scenes[i - 1];
      if (scene.startTime < prev.startTime) {
        errors.push(`场景 ${scene.id} 的 startTime 小于前一个场景`);
      }
    }
  }

  const lastScene = scenes[scenes.length - 1];
  const expectedTotalDuration = lastScene ? lastScene.startTime + lastScene.duration : 0;
  if (storyboard.totalDuration !== expectedTotalDuration) {
    errors.push(`totalDuration 应为 ${expectedTotalDuration}，实际为 ${storyboard.totalDuration}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============ 主函数 ============

function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('用法: node generate-storyboard.js <srtPath> <groupsPath> <outputPath>');
    console.error('');
    console.error('参数:');
    console.error('  srtPath     SRT 字幕文件路径');
    console.error('  groupsPath  AI 生成的 groups.json 路径');
    console.error('  outputPath  输出的 storyboard.json 路径');
    process.exit(1);
  }

  const [srtPath, groupsPath, outputPath] = args;

  // 检查文件是否存在
  if (!fs.existsSync(srtPath)) {
    console.error(`错误: SRT 文件不存在: ${srtPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(groupsPath)) {
    console.error(`错误: groups.json 文件不存在: ${groupsPath}`);
    process.exit(1);
  }

  try {
    // 1. 解析 SRT 文件
    console.log(`📄 解析 SRT 文件: ${srtPath}`);
    const srtContent = fs.readFileSync(srtPath, 'utf-8');
    const subtitles = parseSRT(srtContent);
    console.log(`   找到 ${subtitles.length} 条字幕`);

    // 2. 读取分组信息
    console.log(`📋 读取分组信息: ${groupsPath}`);
    const groupsContent = fs.readFileSync(groupsPath, 'utf-8');
    const groupsData = JSON.parse(groupsContent);
    const groups = groupsData.groups;
    console.log(`   找到 ${groups.length} 个分组`);

    // 3. 验证分组数据
    console.log('🔍 验证分组数据...');
    const validation = validateGroups(groups, subtitles.length);
    if (!validation.valid) {
      console.error('❌ 分组验证失败:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }
    console.log('   ✅ 分组验证通过');

    // 4. 生成场景
    console.log('🎬 生成场景...');
    const scenes = generateScenes(subtitles, groups);

    // 5. 生成 storyboard
    const storyboard = generateStoryboard(scenes);

    const storyboardValidation = validateGeneratedScenes(storyboard);
    if (!storyboardValidation.valid) {
      console.error('❌ storyboard 校验失败:');
      storyboardValidation.errors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }

    // 6. 写入文件
    console.log(`💾 写入文件: ${outputPath}`);
    fs.writeFileSync(outputPath, JSON.stringify(storyboard, null, 2), 'utf-8');

    // 7. 输出摘要
    console.log('');
    console.log('✅ 生成完成!');
    console.log(`   - 场景数量: ${storyboard.sceneCount}`);
    console.log(`   - 总时长: ${(storyboard.totalDuration / 1000).toFixed(1)}s`);
    console.log(`   - 输出文件: ${outputPath}`);

    // 输出 JSON 结果供调用方使用
    console.log('');
    console.log('__RESULT_JSON__');
    console.log(JSON.stringify({
      success: true,
      storyboardPath: outputPath,
      sceneCount: storyboard.sceneCount,
      totalDuration: storyboard.totalDuration
    }));

  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
