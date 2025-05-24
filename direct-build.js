const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始直接构建过程...');

// 确保 icon 文件存在
const iconPath = path.resolve(__dirname, 'build/icon.ico');
if (!fs.existsSync(path.dirname(iconPath))) {
  fs.mkdirSync(path.dirname(iconPath), { recursive: true });
}

// 如果没有图标文件，创建一个空的图标文件
if (!fs.existsSync(iconPath)) {
  console.log('图标文件不存在，将使用默认图标');
}

try {
  // 直接使用 electron-builder 构建，使用详细日志
  console.log('运行 electron-builder...');
  execSync('electron-builder --win --x64 --dir', { stdio: 'inherit' });
  
  // 检查是否生成了 unpacked 目录
  const unpackedDir = path.resolve(__dirname, 'release/1.0.0/win-unpacked');
  if (fs.existsSync(unpackedDir)) {
    console.log('✅ 成功生成 unpacked 目录:', unpackedDir);
    
    // 列出 unpacked 目录中的文件
    console.log('目录内容:');
    const files = fs.readdirSync(unpackedDir);
    files.forEach(file => {
      console.log(`- ${file}`);
    });
    
    // 检查是否有 electron.exe 文件
    if (files.includes('electron.exe')) {
      console.log('找到 electron.exe 文件，尝试重命名...');
      
      // 尝试重命名文件
      try {
        fs.renameSync(
          path.join(unpackedDir, 'electron.exe'),
          path.join(unpackedDir, 'Temu工具箱.exe')
        );
        console.log('✅ 成功重命名为 Temu工具箱.exe');
      } catch (renameError) {
        console.error('❌ 重命名失败:', renameError);
      }
    } else {
      console.log('❌ 未找到 electron.exe 文件');
    }
    
    // 继续构建 NSIS 安装程序
    console.log('构建 NSIS 安装程序...');
    execSync('electron-builder --win --x64 --publish never', { stdio: 'inherit' });
    
    // 检查是否生成了安装包
    const installerPath = path.resolve(__dirname, `release/1.0.0/Temu工具箱-1.0.0-x64.exe`);
    if (fs.existsSync(installerPath)) {
      console.log('✅ 成功生成安装包:', installerPath);
    } else {
      console.log('❌ 未找到安装包');
    }
  } else {
    console.log('❌ 未生成 unpacked 目录');
  }
  
} catch (error) {
  console.error('❌ 构建过程中出错:', error.message);
  process.exit(1);
}
