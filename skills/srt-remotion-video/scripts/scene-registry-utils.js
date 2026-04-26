const fs = require('fs');
const path = require('path');

const DEFAULT_VIDEO_SETTINGS = {
  profile: '1080p30',
  design: {
    width: 1920,
    height: 1080,
  },
  profiles: {
    '1080p30': {
      width: 1920,
      height: 1080,
      fps: 30,
    },
    '4k60': {
      width: 3840,
      height: 2160,
      fps: 60,
    },
  },
};

function getActiveVideoProfile(videoSettings = DEFAULT_VIDEO_SETTINGS) {
  const profileName = videoSettings.profile;
  const profile = videoSettings.profiles && videoSettings.profiles[profileName];
  if (!profile) {
    throw new Error(`未知视频输出配置: ${profileName}`);
  }

  return {
    name: profileName,
    width: profile.width,
    height: profile.height,
    fps: profile.fps,
  };
}

function loadVideoSettings(projectRoot) {
  if (!projectRoot) {
    return DEFAULT_VIDEO_SETTINGS;
  }

  const settingsPath = path.join(projectRoot, 'src', 'video-settings.json');
  if (!fs.existsSync(settingsPath)) {
    return DEFAULT_VIDEO_SETTINGS;
  }

  return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
}

function msToFrames(ms, fps = getActiveVideoProfile().fps) {
  return Math.round((ms / 1000) * fps);
}

function sceneIdToNumber(sceneId) {
  const match = /^scene_(\d{3})$/.exec(sceneId);
  if (!match) {
    throw new Error(`无效的 sceneId: ${sceneId}`);
  }

  return match[1];
}

function sceneIdToComponentName(sceneId) {
  return `Scene${sceneIdToNumber(sceneId)}`;
}

function sceneIdToFilename(sceneId) {
  return `${sceneIdToComponentName(sceneId)}.tsx`;
}

function loadStoryboard(storyboardPath) {
  if (!fs.existsSync(storyboardPath)) {
    throw new Error(`storyboard.json 不存在: ${storyboardPath}`);
  }

  const raw = fs.readFileSync(storyboardPath, 'utf-8');
  const storyboard = JSON.parse(raw);

  if (!storyboard || !Array.isArray(storyboard.scenes)) {
    throw new Error(`storyboard.json 结构无效: ${storyboardPath}`);
  }

  return storyboard;
}

function getScenesDir(projectRoot) {
  return path.join(projectRoot, 'src', 'scenes');
}

function listSceneComponentFiles(projectRoot) {
  const scenesDir = getScenesDir(projectRoot);
  if (!fs.existsSync(scenesDir)) {
    throw new Error(`场景目录不存在: ${scenesDir}`);
  }

  return fs.readdirSync(scenesDir)
    .filter((file) => /^Scene\d{3}\.tsx$/.test(file))
    .sort();
}

function validateStoryboardStructure(storyboard) {
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
    let previousRelativeStart = -1;
    for (let j = 0; j < scene.segments.length; j++) {
      const segment = scene.segments[j];
      if (typeof segment.relativeStart !== 'number' || segment.relativeStart < 0) {
        errors.push(`场景 ${scene.id} 的 segment[${j}] relativeStart 无效`);
      }
      if (typeof segment.relativeDuration !== 'number' || segment.relativeDuration <= 0) {
        errors.push(`场景 ${scene.id} 的 segment[${j}] relativeDuration 无效`);
      }
      if (segment.relativeStart < previousRelativeStart) {
        errors.push(`场景 ${scene.id} 的 segments 时间未递增`);
      }
      previousRelativeStart = segment.relativeStart;
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
  const expectedTotalDuration = lastScene
    ? lastScene.startTime + lastScene.duration
    : 0;

  if (storyboard.totalDuration !== expectedTotalDuration) {
    errors.push(`totalDuration 应为 ${expectedTotalDuration}，实际为 ${storyboard.totalDuration}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateSceneFilesAgainstStoryboard(projectRoot, storyboard) {
  const errors = [];
  const actualFiles = listSceneComponentFiles(projectRoot);
  const expectedFiles = storyboard.scenes.map((scene) => sceneIdToFilename(scene.id));

  for (const expectedFile of expectedFiles) {
    if (!actualFiles.includes(expectedFile)) {
      errors.push(`缺少场景文件: ${expectedFile}`);
    }
  }

  for (const actualFile of actualFiles) {
    if (!expectedFiles.includes(actualFile)) {
      errors.push(`存在未被 storyboard 引用的场景文件: ${actualFile}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    actualFiles,
    expectedFiles,
  };
}

function validateSceneComponentExports(projectRoot, storyboard) {
  const errors = [];

  for (const scene of storyboard.scenes) {
    const filePath = path.join(getScenesDir(projectRoot), sceneIdToFilename(scene.id));
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const componentName = sceneIdToComponentName(scene.id);

    if (!content.includes(`export default ${componentName}`)) {
      errors.push(`场景 ${scene.id} 必须使用默认导出：export default ${componentName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function analyzeSceneTimingUsage(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const segmentAliasNames = new Set();
  const segmentAccessorNames = new Set();
  const directSegmentIndexes = new Set();

  for (const pattern of [/\b(?:const|let|var)\s+(\w+)\s*=\s*segments\b/g]) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      segmentAliasNames.add(match[1]);
    }
  }

  for (const pattern of [
    /\bsegments\s*\[\s*(\d+)\s*\]/g,
  ]) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      directSegmentIndexes.add(Number(match[1]));
    }
  }

  for (const pattern of [
    /\bconst\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*segments\s*\[[^\]]+\]/g,
    /\b(?:let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*segments\s*\[[^\]]+\]/g,
    /\bfunction\s+(\w+)\s*\([^)]*\)\s*\{\s*return\s+segments\s*\[[^\]]+\][\s\S]*?\}/g,
  ]) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      segmentAccessorNames.add(match[1]);
    }
  }

  const declaresSegmentsProp = /segments\??\s*:\s*Array<\{[\s\S]*?relativeStart[\s\S]*?\}>/.test(normalized)
    || /segments\??\s*:\s*Segment\[\]/.test(normalized)
    || /\(\{\s*segments\s*=/.test(normalized)
    || /\(\{\s*segments\s*\}\s*\)/.test(normalized);

  const usesSegmentsCollectionPatterns = [
    /segments\.map\(/,
    /segments\.forEach\(/,
    /segments\.reduce\(/,
    /segments\.filter\(/,
    /segments\s*\[/,
    /for\s*\(\s*const\s+\w+\s+of\s+segments\s*\)/,
    /for\s*\(\s*let\s+\w+\s*=\s*0;\s*\w+\s*<\s*segments\.length/,
  ];
  const usesSegmentsCollection = usesSegmentsCollectionPatterns.some((pattern) => pattern.test(normalized))
    || segmentAliasNames.size > 0
    || segmentAccessorNames.size > 0;

  const suspiciousTimingPatterns = [
    /\bconst\s+(?:beat|b\d+|phase\d+|seg\d+)\w*\s*=\s*(?:msToFrames?|framesFromMs)\(\s*\d{3,}\b/g,
    /\bconst\s+(?:beat|b\d+|phase\d+|seg\d+)\w*(?:Ms|Start|End|Frame|Frames)\s*=\s*\d{3,}\b/g,
    /\b(?:msToFrames?|framesFromMs)\(\s*\d{3,}\s*,/g,
  ];
  const suspiciousTimingMatches = suspiciousTimingPatterns.flatMap((pattern) => normalized.match(pattern) || []);
  const hasSuspiciousHardcodedTiming = suspiciousTimingMatches.length > 0;

  const usesLaterBeatEvidencePatterns = [
    /segments\s*\[\s*1\s*\]/,
    /segments\s*\[\s*2\s*\]/,
    /seg2Start/,
    /seg3Start/,
    /segmentStartFrames?\s*\[\s*1\s*\]/,
    /segmentStartFrames?\s*\[\s*2\s*\]/,
    /segments\.map\(/,
    /for\s*\(\s*const\s+\w+\s+of\s+segments\s*\)/,
  ];
  const usesLaterBeatEvidence = usesLaterBeatEvidencePatterns.some((pattern) => pattern.test(normalized))
    || Array.from(segmentAccessorNames).some((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\s*\\(\\s*[12]\\s*\\)`).test(normalized);
    });

  return {
    declaresSegmentsProp,
    directSegmentIndexes: [...directSegmentIndexes].sort((a, b) => a - b),
    usesSegmentsCollection,
    hasSuspiciousHardcodedTiming,
    suspiciousTimingMatches,
    usesLaterBeatEvidence,
  };
}

function validateSceneTimingAgainstStoryboard(projectRoot, storyboard) {
  const errors = [];
  const warnings = [];

  for (const scene of storyboard.scenes) {
    const filePath = path.join(getScenesDir(projectRoot), sceneIdToFilename(scene.id));
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const analysis = analyzeSceneTimingUsage(content);
    const segmentCount = Array.isArray(scene.segments) ? scene.segments.length : 0;

    if (segmentCount > 1 && analysis.declaresSegmentsProp && !analysis.usesSegmentsCollection) {
      errors.push(`场景 ${scene.id} 已声明 segments 接口，但实现中未真实消费 segments 数据`);
      continue;
    }

    if (segmentCount > 1 && analysis.hasSuspiciousHardcodedTiming) {
      const sample = analysis.suspiciousTimingMatches[0]?.replace(/\s+/g, ' ').trim();
      errors.push(
        `场景 ${scene.id} 检测到疑似硬编码时序拍点` + (sample ? `（例如：${sample}）` : '')
      );
      continue;
    }

    if (segmentCount > 1 && !analysis.declaresSegmentsProp && analysis.usesSegmentsCollection) {
      warnings.push(`场景 ${scene.id} 可能通过中间变量间接消费 segments，建议检查是否显式按 beat 绑定使用 segments`);
    }

    if (segmentCount >= 3 && !analysis.usesLaterBeatEvidence) {
      warnings.push(`场景 ${scene.id} 可能缺少后续拍点展开，建议检查是否把主要内容过早堆在前段`);
    }

    const outOfRangeSegmentIndex = analysis.directSegmentIndexes.find((index) => index >= segmentCount);
    if (typeof outOfRangeSegmentIndex === 'number') {
      errors.push(`场景 ${scene.id} 访问了越界的 segments[${outOfRangeSegmentIndex}]，当前仅有 ${segmentCount} 个 segments`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function buildGeneratedScenesSource(storyboard, options = {}) {
  const fps = options.fps || getActiveVideoProfile(options.videoSettings).fps;
  const imports = storyboard.scenes
    .map((scene) => {
      const componentName = sceneIdToComponentName(scene.id);
      return `import ${componentName} from "../scenes/${componentName}";`;
    })
    .join('\n');

  const sceneEntries = storyboard.scenes
    .map((scene) => {
      const componentName = sceneIdToComponentName(scene.id);
      const segmentsStr = JSON.stringify(scene.segments, null, 6)
        .split('\n')
        .map((line, i) => i === 0 ? line : '      ' + line)
        .join('\n');
      return `  {\n    start: ${scene.startTime},\n    duration: ${scene.duration},\n    segments: ${segmentsStr},\n    Component: ${componentName},\n  },`;
    })
    .join('\n');

  return `import type React from "react";

${imports}

type Segment = {
  text: string;
  relativeStart: number;
  relativeDuration: number;
};

export type GeneratedSceneItem = {
  start: number;
  duration: number;
  segments: Segment[];
  Component: React.FC<{ segments: Segment[] }>;
};

export const generatedScenes: GeneratedSceneItem[] = [
${sceneEntries}
];

export const totalDurationInFrames = ${msToFrames(storyboard.totalDuration, fps)};
`;
}

module.exports = {
  analyzeSceneTimingUsage,
  DEFAULT_VIDEO_SETTINGS,
  buildGeneratedScenesSource,
  getActiveVideoProfile,
  getScenesDir,
  listSceneComponentFiles,
  loadStoryboard,
  loadVideoSettings,
  msToFrames,
  sceneIdToComponentName,
  sceneIdToFilename,
  validateSceneComponentExports,
  validateSceneFilesAgainstStoryboard,
  validateSceneTimingAgainstStoryboard,
  validateStoryboardStructure,
};
