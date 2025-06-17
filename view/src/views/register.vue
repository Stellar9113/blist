<template>
  <div class="register-container">
    <t-card class="register-card">
      <template #header>
        <!-- <h2>注册</h2> -->
      </template>
      <t-form ref="form" :data="formData" :rules="rules" @submit="onSubmit" labelAlign="top">
        <t-form-item label="用户名" name="username">
          <t-input
            v-model="formData.username"
            placeholder="请输入用户名"
            :status="formData.username ? 'success' : 'default'"
          >
            <template #prefix-icon><user-icon /></template>
          </t-input>
        </t-form-item>
        <t-form-item label="邮箱" name="email">
          <t-input v-model="formData.email" placeholder="请输入邮箱" :status="formData.email ? 'success' : 'default'">
            <template #prefix-icon><mail-icon /></template>
          </t-input>
        </t-form-item>
        <t-form-item label="密码" name="password">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            :status="formData.password ? 'success' : 'default'"
          >
            <template #prefix-icon><lock-on-icon /></template>
          </t-input>
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit" block>注册</t-button>
            <t-button theme="default" @click="goToLogin" block>返回登录</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useUserStore } from '@/stores/user'
  import { MessagePlugin } from 'tdesign-vue-next'
  import { UserIcon, MailIcon, LockOnIcon } from 'tdesign-icons-vue-next'
  import axios from '@/stores/axios'

  const router = useRouter()
  const userStore = useUserStore()

  const formData = ref({
    username: '',
    email: '',
    password: ''
  })

  const rules = {
    username: [{ required: true, message: '请输入用户名', type: 'error' }],
    email: [{ required: true, message: '请输入邮箱', type: 'error' }],
    password: [{ required: true, message: '请输入密码', type: 'error' }]
  }

  const onSubmit = async ({ validateResult }) => {
    if (validateResult === true) {
      try {
        const { data } = await axios.post('/api/users/register', formData.value)
        userStore.token = data.token
        userStore.user = data.user
        MessagePlugin.success('注册成功')
        router.push('/')
      } catch (error) {
        MessagePlugin.error(error.error || '注册失败')
      }
    }
  }

  const goToLogin = () => {
    router.push('/login')
  }
</script>

<style scoped>
  .register-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--td-bg-color-page);
  }
  .register-card {
    width: 400px;
  }
</style>
