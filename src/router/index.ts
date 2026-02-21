// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import WorkflowDashboard from '../views/WorkflowDashboard.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: WorkflowDashboard },
  ],
})

export default router