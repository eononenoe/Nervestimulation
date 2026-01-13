const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: ['vuetify'],
  devServer: {
    port: 8080,
    proxy: {
      '/api': {
        target: process.env.VUE_APP_API_URL || 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  lintOnSave: false
})
