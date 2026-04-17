#!/usr/bin/env node

/**
 * 项目初始化脚本
 *
 * 用法:
 *   node init-project.js --srt-path <srt-path>
 *
 * 功能:
 *   - 从 skill 内部 template 复制创建新项目
 *   - 默认创建到字幕目录下的 remotion-video-projects/{timestamp}/
 *   - 若 template 已完成依赖安装，则会一并复制已安装依赖
 *
 * 输出:
 *   成功时输出 JSON: { projectRoot, projectName, createdAt, srtFile }
 */

const fs = require('fs');
const path = require('path');

// 路径配置
const SKILL_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(SKILL_ROOT, 'template');
const PROJECTS_DIR_NAME = 'remotion-video-projects';

/**
 * 生成时间戳格式的项目名称
 */
function generateProjectName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

/**
 * 递归复制目录（若 template 中存在 node_modules 也会复制，正确处理符号链接）
 */
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isSymbolicLink()) {
      // 保留符号链接（相对路径链接在复制后仍然有效）
      const linkTarget = fs.readlinkSync(srcPath);
      try {
        fs.symlinkSync(linkTarget, destPath);
      } catch (e) {
        // 如果符号链接已存在，跳过
        if (e.code !== 'EEXIST') throw e;
      }
    } else if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function resolveSrtPath(inputPath) {
  if (!inputPath) {
    console.error(JSON.stringify({ error: '缺少 srtPath' }));
    process.exit(1);
  }

  return path.resolve(inputPath);
}

/**
 * 创建新项目
 */
function createNewProject(inputSrtPath) {
  // 检查 template 目录
  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(JSON.stringify({ error: 'template 目录不存在' }));
    process.exit(1);
  }

  const srtPath = resolveSrtPath(inputSrtPath);

  if (!fs.existsSync(srtPath)) {
    console.error(JSON.stringify({ error: `SRT 文件不存在: ${srtPath}` }));
    process.exit(1);
  }

  const srtDir = path.dirname(srtPath);
  const projectsDir = path.join(srtDir, PROJECTS_DIR_NAME);

  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  const projectName = generateProjectName();
  const projectRoot = path.join(projectsDir, projectName);

  // 复制 template 到新项目目录
  console.error(`正在创建项目: ${projectName}`);
  copyDirSync(TEMPLATE_DIR, projectRoot);

  return {
    projectName,
    projectRoot,
    createdAt: new Date().toISOString(),
    srtFile: srtPath
  };
}

function parseArgs(args) {
  let srtPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--srt-path') {
      srtPath = args[i + 1] || null;
      i += 1;
    }
  }

  return { srtPath };
}

/**
 * 主函数
 */
function main() {
  const { srtPath } = parseArgs(process.argv.slice(2));

  if (!srtPath) {
    console.error('用法: node init-project.js --srt-path <srt-path>');
    process.exit(1);
  }

  const project = createNewProject(srtPath);
  console.log(JSON.stringify(project, null, 2));
}

main();
