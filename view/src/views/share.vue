<template>
  <div class="share-container">
    <t-card class="share-card">
      <template #header>
        <t-space>
          <FileIcon />
          <span>{{ fileInfo.originalName }}</span>
        </t-space>
      </template>
      <t-form v-if="!isVerified" :data="form" ref="formRef">
        <t-form-item label="提取码">
          <t-input v-model="form.code" placeholder="请输入提取码" />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="handleVerify">验证提取码</t-button>
        </t-form-item>
      </t-form>
      <template v-else>
        <t-space direction="vertical" size="large">
          <t-space>
            <t-button theme="primary" @click="handleDownload">
              <template #icon><DownloadIcon /></template>
              下载文件
            </t-button>
            <t-button @click="handleSaveToMyFiles">
              <template #icon><SaveIcon /></template>
              保存到我的文件
            </t-button>
          </t-space>
          <t-descriptions :data="fileInfo" :columns="columns" />
        </t-space>
      </template>
    </t-card>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { MessagePlugin } from 'tdesign-vue-next'
  import { FileIcon, DownloadIcon, SaveIcon } from 'tdesign-icons-vue-next'
  import axios from '@/stores/axios'
  import { saveAs } from 'file-saver'

  const route = useRoute()
  const router = useRouter()
  const form = ref({ code: '' })
  const isVerified = ref(false)
  const fileInfo = ref({})

  const columns = [
    { label: '文件大小', key: 'size' },
    { label: '上传时间', key: 'createdAt' },
    { label: '分享者', key: 'owner' }
  ]

  // 验证提取码
  const handleVerify = async () => {
    try {
      const { data } = await axios.post(`/api/files/share/${route.params.id}/verify`, {
        code: form.value.code
      })
      isVerified.value = true
      fileInfo.value = data
    } catch (error) {
      MessagePlugin.error('提取码错误')
    }
  }

  // 处理文件下载
  const handleDownload = async () => {
    try {
      const { data } = await axios.post(`/api/files/share/${route.params.id}/download`)
      saveAs(data.url, data.filename)
    } catch (error) {
      MessagePlugin.error('下载失败')
    }
  }
  // 保存到我的文件
  const handleSaveToMyFiles = async () => {
    try {
      await axios.post(`/api/files/share/${route.params.id}/save`)
      MessagePlugin.success('保存成功')
      router.push('/home')
    } catch (error) {
      MessagePlugin.error('保存失败')
    }
  }

  onMounted(async () => {
    try {
      const { data } = await axios.get(`/api/files/share/${route.params.id}`)
      fileInfo.value = data
      // 如果分享没有设置提取码，直接显示文件信息
      if (!data.code) {
        isVerified.value = true
      }
    } catch (error) {
      MessagePlugin.error('分享链接无效或已过期')
      router.push('/home')
    }
  })
</script>

<style scoped>
  .share-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f5f5f5;
  }

  .share-card {
    width: 100%;
    max-width: 600px;
  }
</style>
