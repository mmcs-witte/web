import { createApp } from 'vue'
import { FontAwesomeIcon } from './fontawesome.ts'
import './style.css'
import router from './router.ts'
import { createPinia } from 'pinia'
import App from './App.vue'

const pinia = createPinia()

const app = createApp(App)

app.use(router)
app.use(pinia)
app.component('FontAwesomeIcon', FontAwesomeIcon)
app.mount('#app')
