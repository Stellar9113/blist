<template>
  <div class="shared-container">
    <h2>共享文件</h2>
    <t-table :data="sharedFiles" :columns="columns" :loading="loading" row-key="_id">
      <template #name="{ row }">
        <div class="file-name">
          <folder-icon v-if="row.isFolder" />
          <file-icon v-else />
          {{ row.name }}
        </div>
      </template>
      <template #size="{ row }">
        {{ formatSize(row.size) }}
      </template>
      <template #createdAt="{ row }">
        {{ formatDate(row.createdAt) }}
      </template>
      <template #op="{ row }">
        <t-space>
          <t-button variant="text" @click="handleDownload(row)">下载</t-button>
        </t-space>
      </template>
    </t-table>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { FolderIcon, FileIcon } from 'tdesign-icons-vue-next'
  import { MessagePlugin } from 'tdesign-vue-next'
  import axios from '@/stores/axios'

  const loading = ref(false)
  const sharedFiles = ref([])

  const columns = [
    { colKey: 'name', title: '文件名', width: 300 },
    { colKey: 'size', title: '大小', width: 100 },
    { colKey: 'createdAt', title: '创建时间', width: 180 },
    { colKey: 'op', title: '操作', width: 120 }
  ]

  const formatSize = size => {
    if (size < 1024) return size + 'B'
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + 'KB'
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + 'MB'
    return (size / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
  }

  const formatDate = date => {
    return new Date(date).toLocaleString()
  }

  const handleDownload = async file => {
    try {
      const response = await axios.get(`/api/files/download/${file._id}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.originalName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      MessagePlugin.error('下载失败')
    }
  }

  const loadSharedFiles = async () => {
    loading.value = true
    try {
      const { data } = await axios.post('/api/files/shared')
      sharedFiles.value = data
    } catch (error) {
      MessagePlugin.error('加载共享文件失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadSharedFiles()
  })
</script>

<style scoped>
  .shared-container {
    padding: 20px;
  }

  .file-name {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
