#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  buildGeneratedScenesSource,
  getActiveVideoProfile,
  loadStoryboard,
  loadVideoSettings,
  validateSceneComponentExports,
  validateSceneFilesAgainstStoryboard,
  validateSceneTimingAgainstStoryboard,
  validateStoryboardStructure,
} = require('./scene-registry-utils');

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length > 3) {
    console.error('用法: node generate-scenes-registry.js <projectRoot> <storyboardPath> [outputPath]');
    process.exit(1);
  }

  const [projectRoot, storyboardPath, outputPathArg] = args;
  const outputPath = outputPathArg || path.join(projectRoot, 'src', 'compositions', 'generated-scenes.ts');

  try {
    const storyboard = loadStoryboard(storyboardPath);
    const storyboardValidation = validateStoryboardStructure(storyboard);
    if (!storyboardValidation.valid) {
      console.error('❌ storyboard 校验失败:');
      storyboardValidation.errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }

    const fileValidation = validateSceneFilesAgainstStoryboard(projectRoot, storyboard);
    if (!fileValidation.valid) {
      console.error('❌ 场景文件校验失败:');
      fileValidation.errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }

    const exportValidation = validateSceneComponentExports(projectRoot, storyboard);
    if (!exportValidation.valid) {
      console.error('❌ 场景导出校验失败:');
      exportValidation.errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }

    const timingValidation = validateSceneTimingAgainstStoryboard(projectRoot, storyboard);
    if (!timingValidation.valid) {
      console.error('❌ 场景时序校验失败:');
      timingValidation.errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }

    if (timingValidation.warnings.length > 0) {
      console.warn('⚠️ 场景时序告警:');
      timingValidation.warnings.forEach((warning) => console.warn(`   - ${warning}`));
    }

    const videoSettings = loadVideoSettings(projectRoot);
    const activeProfile = getActiveVideoProfile(videoSettings);
    const source = buildGeneratedScenesSource(storyboard, { videoSettings });
    fs.writeFileSync(outputPath, source, 'utf-8');

    console.log('✅ generated-scenes.ts 已生成');
    console.log(`   - 输出文件: ${outputPath}`);
    console.log(`   - 场景数量: ${storyboard.sceneCount}`);
    console.log(`   - 输出规格: ${activeProfile.width}x${activeProfile.height} / ${activeProfile.fps}fps (${activeProfile.name})`);
    console.log('');
    console.log('__RESULT_JSON__');
    console.log(JSON.stringify({
      success: true,
      outputPath,
      sceneCount: storyboard.sceneCount,
      videoProfile: activeProfile,
    }));
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
