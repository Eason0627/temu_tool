const fs = window.require('fs')
const path = window.require('path')

// 默认扫描当前目录
const ROOT_DIR = process.cwd()

export const readFolders = () => {
  return new Promise((resolve) => {
    const folders = fs.readdirSync(ROOT_DIR).filter(name => {
      return fs.statSync(path.join(ROOT_DIR, name)).isDirectory()
    })
    resolve(folders)
  })
}

export const saveConfigToFile = (configData) => {
  const configPath = path.join(ROOT_DIR, 'config.json')
  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf-8')
}
