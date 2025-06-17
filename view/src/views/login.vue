<template>
  <div class="login-container">
    <t-card class="login-card">
      <template #header>
        <!-- <h2>登录</h2> -->
      </template>
      <t-form ref="form" :data="formData" :rules="rules" @submit="onSubmit" labelAlign="top">
        <t-form-item label="用户名" name="username">
          <t-input
            v-model="formData.username"
            placeholder="请输入用户名"
            :status="formData.username ? 'success' : 'default'"
          >
            <template #prefix-icon><User1Icon /></template>
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
            <t-button theme="primary" type="submit" block>登录</t-button>
            <t-button theme="default" @click="router.push('/register')" block>注册</t-button>
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
  import { User1Icon, LockOnIcon } from 'tdesign-icons-vue-next'
  import axios from '@/stores/axios'

  const router = useRouter()
  const userStore = useUserStore()

  const formData = ref({
    username: '',
    password: ''
  })

  const rules = {
    username: [{ required: true, message: '请输入用户名', type: 'error' }],
    password: [{ required: true, message: '请输入密码', type: 'error' }]
  }

  const onSubmit = async ({ validateResult }) => {
    if (validateResult === true) {
      try {
        const { data } = await axios.post('/api/users/login', formData.value)
        userStore.token = data.token
        userStore.user = data.user
        MessagePlugin.success('登录成功')
        router.push('/home')
      } catch (error) {
        console.log(error)
        MessagePlugin.error(error.error || '登录失败')
      }
    }
  }
</script>

<style scoped>
  .login-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--td-bg-color-page);
  }
  .login-card {
    width: 400px;
  }
</style>
