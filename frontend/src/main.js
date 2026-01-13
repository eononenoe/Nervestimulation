import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

// Global styles
import './assets/styles.scss'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'wellsaferTheme',
    themes: {
      wellsaferTheme: {
        dark: false,
        colors: {
          primary: '#257E53',
          secondary: '#43E396',
          accent: '#9FE3BA',
          thirdly: '#63CC8D',
          background: '#F2F9F5',
          surface: '#FFFFFF',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
          success: '#10B981'
        }
      }
    }
  }
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)

app.mount('#app')
