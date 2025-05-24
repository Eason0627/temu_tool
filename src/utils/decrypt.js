const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 加密密钥 - 优先使用 APP_KEY，这将在构建时被替换为实际值
const ENCRYPTION_KEY = process.env.APP_KEY || process.env.VITE_ENCRYPTION_KEY || '';

// 获取应用资源路径
function getResourcePath(relativePath) {
  // 在生产环境中使用打包后的资源路径
  if (process.env.NODE_ENV === 'production') {
    // 对于打包的应用，使用 app.getAppPath()
    const { app } = require('electron');
    return path.join(app.getAppPath(), 'resources', 'encrypted-assets', relativePath);
  }
  
  // 在开发环境中使用项目路径
  return path.join(__dirname, '../../encrypted-assets', relativePath);
}

// 加载并解密资源
function loadEncryptedResource(relativePath) {
  try {
    // 获取加密资源的完整路径
    const resourcePath = getResourcePath(relativePath);
    
    // 读取加密的文件
    const encryptedData = fs.readFileSync(resourcePath);
    
    // 从文件提取 IV (前16字节)
    const iv = encryptedData.slice(0, 16);
    const encryptedContent = encryptedData.slice(16);
    
    // 从环境变量中获取解密密钥
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    
    // 创建解密器并解密
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // 解密数据
    const decrypted = Buffer.concat([
      decipher.update(encryptedContent),
      decipher.final()
    ]);
    
    return decrypted;
  } catch (error) {
    console.error(`解密资源失败: ${relativePath}`, error);
    throw new Error(`无法加载资源: ${relativePath}`);
  }
}

// 检查文件是否存在
function resourceExists(relativePath) {
  try {
    const resourcePath = getResourcePath(relativePath);
    return fs.existsSync(resourcePath);
  } catch (error) {
    return false;
  }
}

// 获取加密资源列表
function listEncryptedResources(directory = '') {
  try {
    const resourceDir = getResourcePath(directory);
    if (fs.existsSync(resourceDir) && fs.statSync(resourceDir).isDirectory()) {
      return fs.readdirSync(resourceDir);
    }
    return [];
  } catch (error) {
    console.error(`获取资源列表失败: ${directory}`, error);
    return [];
  }
}

module.exports = {
  loadEncryptedResource,
  resourceExists,
  listEncryptedResources
};
