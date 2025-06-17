<template>
  <div class="layout-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <div class="logo">
        <span class="title">Blist网盘</span>
      </div>
      <div class="user-info">
        <t-dropdown :options="userOptions" @click="handleUserAction">
          <t-button variant="text">
            {{ userStore.user?.username }}
            <template #suffix><ChevronDownIcon /></template>
          </t-button>
        </t-dropdown>
      </div>
    </div>
    <!-- 主体内容区 -->
    <div class="main-container">
      <!-- 侧边菜单 -->
      <t-menu
        theme="light"
        :collapsed="collapsed"
        :value="activeMenu"
        defaultValue="admin"
        @change="handleMenuChange"
        class="side-menu"
      >
        <t-menu-item value="home" to="/home">
          <template #icon><FolderIcon /></template>
          我的文件
        </t-menu-item>
        <t-menu-item value="shared" to="/shared">
          <template #icon><ShareIcon /></template>
          共享文件
        </t-menu-item>
        <t-menu-item value="recent" to="/recent">
          <template #icon><TimeIcon /></template>
          最近文件
        </t-menu-item>
        <!-- 管理员菜单 -->
        <template v-if="userStore.user?.role === 'admin'">
          <t-submenu value="admin" title="后台管理">
            <template #icon><setting-icon /></template>
            <t-menu-item value="config" to="/admin/config">
              <span>系统配置</span>
            </t-menu-item>
          </t-submenu>
        </template>
        <template #operations>
          <t-button class="t-demo-collapse-btn" variant="text" shape="square" @click="collapsed = !collapsed">
            <template #icon><t-icon name="view-list" /></template>
          </t-button>
        </template>
      </t-menu>
      <!-- 内容区域 -->
      <div class="content">
        <t-config-provider>
          <router-view></router-view>
        </t-config-provider>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch } from 'vue'
  import { ShareIcon, FolderIcon, TimeIcon, ChevronDownIcon, SettingIcon } from 'tdesign-icons-vue-next'
  import { useRoute, useRouter } from 'vue-router'
  import { useUserStore } from '@/stores/user'
  import axios from '@/stores/axios'

  const router = useRouter()

  const route = useRoute()
  const userStore = useUserStore()
  const activeMenu = ref('home')
  const collapsed = ref(false)

  const userOptions = [
    { content: '个人设置', value: 'settings' },
    { content: '退出登录', value: 'logout' }
  ]

  const handleUserAction = ({ value }) => {
    if (value === 'logout') {
      userStore.user = null
      userStore.token = ''
      router.push('/login')
    }
  }

  const handleMenuChange = value => {
    activeMenu.value = value
  }

  const routerWatch = url => {
    const segments = url.split('/').filter(Boolean)
    activeMenu.value = segments.length > 1 ? segments[1] : segments[0] || 'home'
  }

  watch(
    () => route.path,
    newPath => routerWatch(newPath)
  )

  // 获取配置
  const fetchConfig = async () => {
    try {
      const { data } = await axios.post('/api/auth/config')
      userStore.config = data
    } catch ({ response }) {
      message.error(response?.data?.error)
    }
  }

  onMounted(async () => {
    fetchConfig()
    routerWatch(location.pathname)
  })
</script>

<style scoped>
  .home-container {
    padding: 20px;
  }
  .operation-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .breadcrumb {
    margin-bottom: 20px;
  }
  .layout-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .header {
    height: 60px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--td-bg-color-container);
    border-bottom: 1px solid var(--td-component-border);
  }

  .logo {
    display: flex;
    align-items: center;
  }

  .title {
    font-size: 18px;
    font-weight: bold;
  }

  .main-container {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .side-menu {
    width: 200px;
    border-right: 1px solid var(--td-component-border);
  }

  .content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .user-info {
    display: flex;
    align-items: center;
  }
</style>
