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

function validateRoot(rootPath) {
  const errors = [];
  if (!fs.existsSync(rootPath)) {
    errors.push(`缺少 Root.tsx: ${rootPath}`);
    return { valid: false, errors };
  }

  const content = fs.readFileSync(rootPath, 'utf-8');
  if (!content.includes('import { totalDurationInFrames } from "./compositions/generated-scenes";')) {
    errors.push('Root.tsx 未从 generated-scenes.ts 导入 totalDurationInFrames');
  }
  if (!content.includes('durationInFrames={totalDurationInFrames}')) {
    errors.push('Root.tsx 未使用 totalDurationInFrames 作为 Composition.durationInFrames');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateMain(mainPath) {
  const errors = [];
  if (!fs.existsSync(mainPath)) {
    errors.push(`缺少 Main.tsx: ${mainPath}`);
    return { valid: false, errors };
  }

  const content = fs.readFileSync(mainPath, 'utf-8');
  if (!content.includes('import { generatedScenes }')) {
    errors.push('Main.tsx 未导入 generatedScenes');
  }
  if (!content.includes('generatedScenes.map((scene, index) =>')) {
    errors.push('Main.tsx 未使用 generatedScenes 渲染场景序列');
  }
  if (!content.includes('<Component segments={scene.segments} />')) {
    errors.push('Main.tsx 未通过 <Component segments={scene.segments} /> 向场景组件传递分段数据');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateRegistry(registryPath, storyboard, videoSettings) {
  const errors = [];
  if (!fs.existsSync(registryPath)) {
    errors.push(`缺少 generated-scenes.ts: ${registryPath}`);
    return { valid: false, errors };
  }

  const actual = fs.readFileSync(registryPath, 'utf-8').trim();
  const expected = buildGeneratedScenesSource(storyboard, { videoSettings }).trim();
  if (actual !== expected) {
    errors.push('generated-scenes.ts 与 storyboard.json / 场景文件不一致');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('用法: node validate-project.js <projectRoot> <storyboardPath>');
    process.exit(1);
  }

  const [projectRoot, storyboardPath] = args;
  const rootPath = path.join(projectRoot, 'src', 'Root.tsx');
  const mainPath = path.join(projectRoot, 'src', 'compositions', 'Main.tsx');
  const registryPath = path.join(projectRoot, 'src', 'compositions', 'generated-scenes.ts');

  try {
    const storyboard = loadStoryboard(storyboardPath);
    const videoSettings = loadVideoSettings(projectRoot);
    const activeProfile = getActiveVideoProfile(videoSettings);
    const validations = [
      validateStoryboardStructure(storyboard),
      validateSceneFilesAgainstStoryboard(projectRoot, storyboard),
      validateSceneComponentExports(projectRoot, storyboard),
      validateSceneTimingAgainstStoryboard(projectRoot, storyboard),
      validateRegistry(registryPath, storyboard, videoSettings),
      validateRoot(rootPath),
      validateMain(mainPath),
    ];

    const errors = validations.flatMap((result) => result.errors);
    const warnings = validations.flatMap((result) => result.warnings || []);
    if (errors.length > 0) {
      console.error('❌ 项目校验失败:');
      errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }

    if (warnings.length > 0) {
      console.warn('⚠️ 项目校验告警:');
      warnings.forEach((warning) => console.warn(`   - ${warning}`));
    }

    console.log('✅ 项目校验通过');
    console.log(`   - projectRoot: ${projectRoot}`);
    console.log(`   - storyboard: ${storyboardPath}`);
    console.log(`   - sceneCount: ${storyboard.sceneCount}`);
    console.log(`   - videoProfile: ${activeProfile.width}x${activeProfile.height} / ${activeProfile.fps}fps (${activeProfile.name})`);
    console.log('');
    console.log('__RESULT_JSON__');
    console.log(JSON.stringify({
      success: true,
      projectRoot,
      storyboardPath,
      sceneCount: storyboard.sceneCount,
      videoProfile: activeProfile,
    }));
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
