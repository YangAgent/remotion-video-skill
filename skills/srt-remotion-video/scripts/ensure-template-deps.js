#!/usr/bin/env node

/**
 * 模板依赖预检脚本
 *
 * 用法:
 *   node ensure-template-deps.js <templateRoot>
 *
 * 功能:
 *   - 检查 template/package.json 和 package-lock.json 是否存在
 *   - 检查模板关键依赖是否已安装
 *   - 若未安装，则在 templateRoot 下执行 npm install
 */

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const REQUIRED_PACKAGES = [
  'remotion',
  'react',
  'react-dom',
  '@remotion/cli',
  'lucide-react',
];

function fail(stage, error, extra = {}) {
  console.error(JSON.stringify({
    success: false,
    stage,
    error,
    ...extra,
  }, null, 2));
  process.exit(1);
}

function ensureTemplateFiles(templateRoot) {
  const packageJsonPath = path.join(templateRoot, 'package.json');
  const packageLockPath = path.join(templateRoot, 'package-lock.json');

  if (!fs.existsSync(templateRoot)) {
    fail('precheck', `template 目录不存在: ${templateRoot}`);
  }

  if (!fs.existsSync(packageJsonPath)) {
    fail('precheck', `缺少 package.json: ${packageJsonPath}`);
  }

  if (!fs.existsSync(packageLockPath)) {
    fail('precheck', `缺少 package-lock.json: ${packageLockPath}`);
  }
}

function canResolvePackage(templateRoot, packageName) {
  try {
    require.resolve(`${packageName}/package.json`, {paths: [templateRoot]});
    return true;
  } catch (error) {
    return false;
  }
}

function getMissingPackages(templateRoot) {
  const nodeModulesPath = path.join(templateRoot, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    return [...REQUIRED_PACKAGES];
  }

  return REQUIRED_PACKAGES.filter((packageName) => !canResolvePackage(templateRoot, packageName));
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runNpmInstall(templateRoot) {
  const npmCommand = getNpmCommand();
  const probe = spawnSync(npmCommand, ['--version'], {
    cwd: templateRoot,
    encoding: 'utf-8',
  });

  if (probe.error) {
    fail('precheck', `无法执行 npm: ${probe.error.message}`);
  }

  if (probe.status !== 0) {
    fail('precheck', 'npm 不可用，无法安装模板依赖', {
      stderr: (probe.stderr || '').trim(),
    });
  }

  console.error(`模板依赖缺失，正在安装: ${templateRoot}`);
  const install = spawnSync(npmCommand, ['install'], {
    cwd: templateRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (install.error) {
    fail('install', `npm install 执行失败: ${install.error.message}`);
  }

  if (install.status !== 0) {
    fail('install', 'npm install 失败', {
      stdout: (install.stdout || '').trim().slice(-4000),
      stderr: (install.stderr || '').trim().slice(-4000),
    });
  }
}

function main() {
  const [templateRootArg] = process.argv.slice(2);
  if (!templateRootArg) {
    console.error('用法: node ensure-template-deps.js <templateRoot>');
    process.exit(1);
  }

  const templateRoot = path.resolve(templateRootArg);
  ensureTemplateFiles(templateRoot);

  const missingBeforeInstall = getMissingPackages(templateRoot);
  const alreadyInstalled = missingBeforeInstall.length === 0;

  if (!alreadyInstalled) {
    console.error(`检测到模板依赖缺失: ${missingBeforeInstall.join(', ')}`);
    runNpmInstall(templateRoot);
  } else {
    console.error('模板依赖已就绪，跳过安装');
  }

  const missingAfterInstall = getMissingPackages(templateRoot);
  if (missingAfterInstall.length > 0) {
    fail('verify', `模板依赖安装后仍缺失: ${missingAfterInstall.join(', ')}`, {
      missingPackages: missingAfterInstall,
    });
  }

  console.log(JSON.stringify({
    success: true,
    templateRoot,
    alreadyInstalled,
    installedWith: 'npm',
  }, null, 2));
}

main();
