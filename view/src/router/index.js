import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/home.vue')
  },
  {
    path: '/shared',
    name: 'Shared',
    component: () => import('@/views/shared.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/recent',
    name: 'Recent',
    component: () => import('@/views/recent.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/register.vue')
  },
  {
    path: '/share/:id',
    name: 'ShareId',
    component: () => import('@/views/share.vue')
  },
  {
    path: '/file/:id',
    name: 'FileId',
    component: () => import('@/views/detail.vue')
  },
  {
    path: '/admin',
    redirect: '/admin/config',
    children: [
      {
        path: 'config',
        name: 'AdminConfig',
        component: () => import(`@/views/admin/config.vue`)
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && to.path !== '/register' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
