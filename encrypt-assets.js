const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// 加载 .env 文件
dotenv.config();

// 使用 .env 中的 APP_KEY 作为加密密钥
const encryptionKey = process.env.APP_KEY || 'fallback-key';

if (!process.env.APP_KEY) {
  console.warn('警告: 未找到 APP_KEY 环境变量，使用后备密钥！');
}

// 源目录和输出目录
const sourceDir = path.resolve(__dirname, './assets');
const outputDir = path.resolve(__dirname, './encrypted-assets');

// 确保源目录存在
if (!fs.existsSync(sourceDir)) {
  console.error(`错误: 源目录 "${sourceDir}" 不存在!`);
  process.exit(1);
}

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`使用配置:
- 加密密钥: ${encryptionKey.substring(0, 3)}...${encryptionKey.substring(encryptionKey.length - 3)}
- 源目录: ${sourceDir}
- 输出目录: ${outputDir}
`);

// 将字符串密钥转换为有效的密钥
const key = crypto.createHash('sha256').update(encryptionKey).digest();

// 加密文件
function encryptFile(filePath, outputPath) {
  try {
    const fileData = fs.readFileSync(filePath);
    const iv = crypto.randomBytes(16);
    
    // 加密数据
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encryptedData = Buffer.concat([
      iv,  // 将 IV 存储在文件开头
      cipher.update(fileData),
      cipher.final()
    ]);
    
    // 写入加密数据
    fs.writeFileSync(outputPath, encryptedData);
    console.log(`已加密: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`加密 ${filePath} 时出错:`, error);
  }
}

// 递归处理目录
function processDirectory(dir, outputBase, relativePath = '') {
  const currentDir = path.join(dir, relativePath);
  const currentOutputDir = path.join(outputBase, relativePath);
  
  // 确保输出目录存在
  if (!fs.existsSync(currentOutputDir)) {
    fs.mkdirSync(currentOutputDir, { recursive: true });
  }
  
  // 读取目录内容
  const items = fs.readdirSync(currentDir);
  
  for (const item of items) {
    const itemPath = path.join(currentDir, item);
    const itemStat = fs.statSync(itemPath);
    const relativeItemPath = relativePath ? path.join(relativePath, item) : item;
    
    if (itemStat.isDirectory()) {
      // 递归处理子目录
      processDirectory(dir, outputBase, relativeItemPath);
    } else {
      // 加密文件
      const outputPath = path.join(outputBase, relativeItemPath);
      encryptFile(itemPath, outputPath);
    }
  }
}

// 开始处理
console.log(`开始加密 ${sourceDir} 目录下的资源文件...`);
processDirectory(sourceDir, outputDir);
console.log(`所有资源已加密到 ${outputDir}`);

// 保存加密信息（用于解密工具）
const configPath = path.join(outputDir, '.encryption-config');
fs.writeFileSync(configPath, JSON.stringify({
  algorithm: 'aes-256-cbc',
  keyDerivation: 'sha256',
  ivLength: 16
}));

// 将加密密钥导出为环境变量，供后续脚本使用
process.env.VITE_ENCRYPTION_KEY = encryptionKey;

// 创建一个加密密钥信息文件，供构建脚本使用
fs.writeFileSync(
  path.resolve(__dirname, './.encryption-key'),
  encryptionKey
);

console.log('加密密钥已保存到 .encryption-key 文件');
