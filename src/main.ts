import { createApp } from 'vue'
//import { Router } from "vue-router";
import { FontAwesomeIcon } from './fontawesome.ts'
import './style.css'
import router from './router.ts'
import App from './App.vue'

createApp(App).use(router).component('FontAwesomeIcon', FontAwesomeIcon).mount('#app')
