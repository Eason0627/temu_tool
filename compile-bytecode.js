const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 解析命令行参数
const args = process.argv.slice(2);
let files = '';
let outputDir = '';

for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '--files') files = args[i + 1];
  if (args[i] === '--output') outputDir = args[i + 1];
}

if (!files || !outputDir) {
  console.error('用法: node compile-bytecode.js --files <文件路径,用逗号分隔> --output <输出目录>');
  process.exit(1);
}

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 将文件编译为字节码
const fileList = files.split(',');

console.log('开始编译文件到字节码...');

fileList.forEach(filePath => {
  try {
    const fileName = path.basename(filePath);
    const outputPath = path.join(outputDir, fileName);
    
    // 检查是否已安装 bytecode
    try {
      execSync('bytecode --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('正在安装 bytecode 编译器...');
      execSync('npm install -g bytenode', { stdio: 'inherit' });
    }
    
    // 编译到字节码
    console.log(`编译 ${fileName}...`);
    execSync(`bytecode ${filePath} -o ${outputPath}`, { stdio: 'inherit' });
    
    console.log(`✅ 已编译: ${fileName}`);
  } catch (error) {
    console.error(`❌ 编译 ${filePath} 时出错:`, error);
  }
});

console.log('字节码编译完成!');
