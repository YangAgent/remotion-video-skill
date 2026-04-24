#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fail(errors) {
  console.error('❌ scene-plan 校验失败:');
  errors.forEach((error) => console.error(`   - ${error}`));
  console.log('');
  console.log('__RESULT_JSON__');
  console.log(JSON.stringify({
    success: false,
    errors,
  }));
  process.exit(1);
}

function parseArgs() {
  const [planPathArg, scenesDataPathArg] = process.argv.slice(2);
  if (!planPathArg || !scenesDataPathArg) {
    console.error('用法: node validate-scene-plan.js <planPath> <scenesDataPath>');
    process.exit(1);
  }

  return {
    planPath: path.resolve(planPathArg),
    scenesDataPath: path.resolve(scenesDataPathArg),
  };
}

function loadJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} 不存在: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateCard(card, scene, errors) {
  const requiredStringFields = ['sceneId', 'goal', 'layout', 'visualCore', 'surface', 'emphasis'];
  requiredStringFields.forEach((field) => {
    if (!isNonEmptyString(card[field])) {
      errors.push(`scene ${scene.id} 的 ${field} 必须为非空字符串`);
    }
  });

  if (!Array.isArray(card.screenShouldShow) || card.screenShouldShow.length === 0) {
    errors.push(`scene ${scene.id} 的 screenShouldShow 必须为非空数组`);
  } else if (card.screenShouldShow.some((item) => !isNonEmptyString(item))) {
    errors.push(`scene ${scene.id} 的 screenShouldShow 项必须为非空字符串`);
  }

  if (!Array.isArray(card.beatPlan) || card.beatPlan.length === 0) {
    errors.push(`scene ${scene.id} 的 beatPlan 必须为非空数组`);
    return;
  }

  const coverage = [];
  card.beatPlan.forEach((beat, beatIndex) => {
    if (!beat || !Array.isArray(beat.segments) || beat.segments.length === 0) {
      errors.push(`scene ${scene.id} 的 beatPlan[${beatIndex}] 必须包含非空 segments 数组`);
      return;
    }

    if (!isNonEmptyString(beat.action)) {
      errors.push(`scene ${scene.id} 的 beatPlan[${beatIndex}] action 必须为非空字符串`);
    }

    let prev = null;
    const seen = new Set();
    beat.segments.forEach((segmentIndex) => {
      if (!Number.isInteger(segmentIndex)) {
        errors.push(`scene ${scene.id} 的 beatPlan[${beatIndex}] 包含非整数 segment 索引`);
        return;
      }
      if (segmentIndex < 0 || segmentIndex >= scene.segments.length) {
        errors.push(`scene ${scene.id} 的 beatPlan[${beatIndex}] segment 索引越界: ${segmentIndex}`);
      }
      if (seen.has(segmentIndex)) {
        errors.push(`scene ${scene.id} 的 beatPlan[${beatIndex}] segment 索引重复: ${segmentIndex}`);
      }
      if (prev !== null && segmentIndex !== prev + 1) {
        errors.push(`scene ${scene.id} 的 beatPlan[${beatIndex}] 只能合并相邻 segments`);
      }
      seen.add(segmentIndex);
      prev = segmentIndex;
      coverage.push(segmentIndex);
    });
  });

  if (coverage.length > 0) {
    const sorted = [...coverage].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i] !== i) {
        errors.push(`scene ${scene.id} 的 beatPlan 必须完整且唯一覆盖 0 到 ${scene.segments.length - 1} 的全部 segments`);
        break;
      }
      if (i > 0 && sorted[i] === sorted[i - 1]) {
        errors.push(`scene ${scene.id} 的 beatPlan 存在重复覆盖的 segment 索引: ${sorted[i]}`);
        break;
      }
    }
    if (sorted.length !== scene.segments.length) {
      errors.push(`scene ${scene.id} 的 beatPlan 覆盖数量应为 ${scene.segments.length}，实际为 ${sorted.length}`);
    }
  }
}

function main() {
  const {planPath, scenesDataPath} = parseArgs();
  const errors = [];

  let plan;
  let scenesData;
  try {
    plan = loadJson(planPath, 'scene-plan');
    scenesData = loadJson(scenesDataPath, 'scenesData');
  } catch (error) {
    fail([error.message]);
  }

  if (!Array.isArray(plan)) {
    fail(['scene-plan 根结构必须是 JSON 数组']);
  }

  if (!Array.isArray(scenesData)) {
    fail([`scenesData 根结构必须是 JSON 数组: ${scenesDataPath}`]);
  }

  if (scenesData.length === 0) {
    fail(['scenesData 不能为空数组']);
  }

  if (plan.length !== scenesData.length) {
    errors.push(`scene-plan 数量应为 ${scenesData.length}，实际为 ${plan.length}`);
  }

  const scenesDataMap = new Map(scenesData.map((scene) => [scene.id, scene]));
  const allowedSceneIds = scenesData.map((scene) => scene.id);
  const allowedSet = new Set(allowedSceneIds);
  const actualIds = [];

  plan.forEach((card, index) => {
    if (!card || typeof card !== 'object' || Array.isArray(card)) {
      errors.push(`scene-plan[${index}] 必须为对象`);
      return;
    }

    if (!isNonEmptyString(card.sceneId)) {
      errors.push(`scene-plan[${index}] 缺少有效的 sceneId`);
      return;
    }

    actualIds.push(card.sceneId);

    if (!allowedSet.has(card.sceneId)) {
      errors.push(`scene ${card.sceneId} 不在当前 creator 的 scenesData 范围内`);
      return;
    }

    const scene = scenesDataMap.get(card.sceneId);
    if (!scene) {
      errors.push(`scene ${card.sceneId} 在 scenesData 中不存在`);
      return;
    }

    validateCard(card, scene, errors);
  });

  const actualSet = new Set(actualIds);
  allowedSceneIds.forEach((sceneId) => {
    if (!actualSet.has(sceneId)) {
      errors.push(`scene-plan 缺少 scene: ${sceneId}`);
    }
  });

  if (actualSet.size !== actualIds.length) {
    errors.push('scene-plan 中存在重复的 sceneId');
  }

  if (errors.length > 0) {
    fail(errors);
  }

  console.log('✅ scene-plan 校验通过');
  console.log(`   - planPath: ${planPath}`);
  console.log(`   - scenes: ${allowedSceneIds.join(', ')}`);
  console.log('');
  console.log('__RESULT_JSON__');
  console.log(JSON.stringify({
    success: true,
    planPath,
    validatedSceneIds: allowedSceneIds,
  }));
}

main();
