#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fail(error, extra = {}) {
  console.error(JSON.stringify({
    success: false,
    error,
    ...extra,
  }, null, 2));
  process.exit(1);
}

function parseCreatorNumber(creatorId) {
  const match = /^creator-(\d+)$/.exec(String(creatorId).trim());
  if (!match) {
    fail(`creatorId 格式无效: ${creatorId}`);
  }

  const numericId = Number(match[1]);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    fail(`creatorId 序号无效: ${creatorId}`);
  }

  return numericId;
}

function loadStoryboard(storyboardPath) {
  if (!fs.existsSync(storyboardPath)) {
    fail(`storyboard.json 不存在: ${storyboardPath}`);
  }

  const storyboard = JSON.parse(fs.readFileSync(storyboardPath, 'utf-8'));
  if (!storyboard || !Array.isArray(storyboard.scenes)) {
    fail(`storyboard.json 结构无效: ${storyboardPath}`);
  }

  return storyboard;
}

function ensureOutputDir(outputPath) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }
}

function main() {
  const [storyboardPathArg, creatorId, scenesPerCreatorArg, outputPathArg] = process.argv.slice(2);

  if (!storyboardPathArg || !creatorId || !scenesPerCreatorArg || !outputPathArg) {
    console.error('用法: node generate-creator-scenes.js <storyboardPath> <creatorId> <scenesPerCreator> <outputPath>');
    process.exit(1);
  }

  const storyboardPath = path.resolve(storyboardPathArg);
  const outputPath = path.resolve(outputPathArg);
  const scenesPerCreator = Number(scenesPerCreatorArg);

  if (!Number.isInteger(scenesPerCreator) || scenesPerCreator <= 0) {
    fail(`scenesPerCreator 无效: ${scenesPerCreatorArg}`);
  }

  const creatorNumber = parseCreatorNumber(creatorId);
  const storyboard = loadStoryboard(storyboardPath);

  const startIndex = (creatorNumber - 1) * scenesPerCreator;
  const endIndexExclusive = startIndex + scenesPerCreator;
  const scenesData = storyboard.scenes.slice(startIndex, endIndexExclusive);

  if (scenesData.length === 0) {
    fail(`creator ${creatorId} 没有可分配的 scenes`, {
      creatorId,
      sceneCount: storyboard.scenes.length,
      scenesPerCreator,
    });
  }

  ensureOutputDir(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(scenesData, null, 2), 'utf-8');

  console.log(JSON.stringify({
    success: true,
    creatorId,
    storyboardPath,
    outputPath,
    scenesPerCreator,
    sceneIds: scenesData.map((scene) => scene.id),
  }, null, 2));
}

main();
