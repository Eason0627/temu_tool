
      const { defineConfig } = require('electron-vite');
      
      module.exports = defineConfig({
        main: {
          build: {
            rollupOptions: {
              input: { index: './dist/obfuscated/main.js'
              }
            }
          }
        },
        preload: {
          build: {
            rollupOptions: {
              input: { index: './dist/obfuscated/preload.js'
              }
            }
          }
        },
        renderer: {}
      });
    