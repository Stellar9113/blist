<template>
  <div class="home-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <t-space>
        <t-button theme="primary" @click="handleUpload">
          <template #icon><UploadIcon /></template>
          上传文件
        </t-button>
        <t-button @click="handleCreateFolder">
          <template #icon><FolderAddIcon /></template>
          新建文件夹
        </t-button>
      </t-space>
      <t-space>
        <t-input v-model="searchKeyword" placeholder="搜索文件" clearable @enter="handleSearch">
          <template #prefix-icon><SearchIcon /></template>
        </t-input>
      </t-space>
    </div>

    <!-- 面包屑导航 -->
    <t-breadcrumb class="breadcrumb">
      <t-breadcrumb-item @click="navigateTo(null)">根目录</t-breadcrumb-item>
      <t-breadcrumb-item v-for="folder in currentPath" :key="folder._id" @click="navigateTo(folder._id)">
        {{ folder.name }}
      </t-breadcrumb-item>
    </t-breadcrumb>

    <!-- 文件列表 -->
    <t-table :data="files" row-key="_id" :columns="columns" :loading="loading" hover>
      <template #name="{ row }">
        <t-space
          @contextmenu.prevent="onContextMenu($event, row)"
          @click="
            () => {
              if (row.isFolder) {
                navigateTo(row._id)
              } else {
                router.push(`/file/${row._id}`)
              }
            }
          "
        >
          <component :is="row.isFolder ? FolderIcon : FileIcon" />
          {{ row.originalName }}
        </t-space>
      </template>
      <template #size="{ row }">
        {{ formatFileSize(row.size) }}
      </template>
      <template #createdAt="{ row }">
        {{ formatDate(row.createdAt) }}
      </template>
      <template #op="{ row }">
        <t-space>
          <t-button v-if="!row.isFolder" theme="primary" variant="text" @click.stop="handleDownload(row)">
            下载
          </t-button>
          <t-button theme="danger" variant="text" @click.stop="handleDelete(row)">删除</t-button>
        </t-space>
      </template>
    </t-table>
    <t-dialog v-model:visible="folderDialogVisible" header="新建文件夹" :on-confirm="onCreateFolder">
      <t-input v-model="newFolderName" placeholder="请输入文件夹名称" />
    </t-dialog>
    <t-drawer
      v-model:visible="uploadDialogVisible"
      size="large"
      destroy-on-close
      lazy
      :footer="false"
      header="上传文件"
    >
      <t-upload v-model="uploadFiles" theme="file-flow" @select-change="onUploadFile" multiple />
    </t-drawer>
    <t-dialog
      v-model:visible="shareDialogVisible"
      header="分享文件"
      :on-confirm="onShareConfirm"
      :close-on-overlay-click="false"
    >
      <t-form :data="shareForm" ref="shareFormRef" labelAlign="top">
        <t-form-item label="分享有效期">
          <t-radio-group v-model="shareForm.expireTime">
            <t-radio :value="item.value" v-for="item in expireOptions">{{ item.label }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="提取码">
          <t-radio-group v-model="shareForm.codeType" @change="changeCodeType">
            <t-radio value="random">随机生成</t-radio>
            <t-radio value="custom">自定义</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item>
          <t-input
            v-if="shareForm.codeType === 'custom'"
            v-model="shareForm.code"
            placeholder="请输入4位提取码"
            :maxlength="4"
          />
          <t-input v-else v-model="shareForm.code" readonly :value="randomCode" class="custom-input" />
          <t-button v-if="shareForm.codeType === 'random'" @click="regenerateCode">
            <template #icon><RefreshIcon /></template>
            重置
          </t-button>
        </t-form-item>
      </t-form>
      <template #footer>
        <t-space>
          <t-button @click="shareDialogVisible = false">取消</t-button>
          <t-button theme="primary" class="copy" @click="generateShareLink">生成分享链接</t-button>
        </t-space>
      </template>
    </t-dialog>
    <!-- 重命名对话框 -->
    <t-dialog v-model:visible="renameDialogVisible" header="重命名" :on-confirm="onRenameConfirm">
      <t-input v-model="newFileName" placeholder="请输入新文件名" />
    </t-dialog>
    <!-- 移动对话框 -->
    <t-dialog v-model:visible="moveDialogVisible" header="移动到" :on-confirm="onMoveConfirm">
      <t-tree
        :data="folderTree"
        :keys="{ value: '_id', label: 'name', children: 'children' }"
        @change="handleFolderSelect"
      />
    </t-dialog>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed, getCurrentInstance } from 'vue'
  import { useUserStore } from '@/stores/user'
  import { MessagePlugin } from 'tdesign-vue-next'
  import { UploadIcon, FolderAddIcon, SearchIcon, FolderIcon, FileIcon, RefreshIcon } from 'tdesign-icons-vue-next'
  import axios from '@/stores/axios'
  import { copy } from '@/stores/public'
  import { useRouter } from 'vue-router'
  import qs from 'qs'
  import { saveAs } from 'file-saver'

  const { proxy } = getCurrentInstance()

  const userStore = useUserStore()

  const router = useRouter()
  const loading = ref(false)
  const searchKeyword = ref('')
  const currentPath = ref([])
  const folderDialogVisible = ref(false)
  const newFolderName = ref('')
  const uploadDialogVisible = ref(false)
  const uploadFiles = ref([])
  const files = ref([])
  const parentId = ref(null)
  const newFileName = ref('')
  const renameDialogVisible = ref(false)
  const selectedFile = ref(null)

  // 分享相关
  const shareDialogVisible = ref(false)
  const shareForm = ref({
    expireTime: 7,
    codeType: 'random',
    code: ''
  })
  const expireOptions = [
    { label: '1天', value: 1 },
    { label: '7天', value: 7 },
    { label: '30天', value: 30 },
    { label: '365天', value: 365 },
    { label: '永久', value: -1 }
  ]

  // 表格列定义
  const columns = [
    {
      colKey: 'name',
      title: '文件名',
      width: '40%'
    },
    {
      colKey: 'size',
      title: '大小',
      width: '15%'
    },
    {
      colKey: 'createdAt',
      title: '创建时间',
      width: '20%'
    },
    {
      colKey: 'op',
      title: '操作',
      width: '25%'
    }
  ]

  // 移动对话框相关
  const moveDialogVisible = ref(false)
  const selectedFolder = ref(null)

  // 生成随机提取码
  const generateRandomCode = () => {
    return Math.random().toString(36).substr(2, 4).toUpperCase()
  }

  const changeCodeType = type => {
    if (type === 'custom') {
      shareForm.value.code = ''
    } else {
      regenerateCode()
    }
  }

  const randomCode = computed(() => {
    if (shareForm.value.codeType === 'random') {
      return generateRandomCode()
    }
    return shareForm.value.code
  })

  // 重置提取码
  const regenerateCode = () => {
    shareForm.value.code = generateRandomCode()
  }

  // 生成分享链接
  const generateShareLink = async () => {
    try {
      const code = shareForm.value.codeType === 'random' ? randomCode.value : shareForm.value.code
      const { data } = await axios.post(`/api/files/${selectedFile.value._id}/share`, {
        expireTime: shareForm.value.expireTime,
        code
      })
      if (data) {
        const shareText = `链接: ${window.location.origin}/share/${data.shareId} 提取码: ${code}`
        copy(shareText)
        shareDialogVisible.value = false
      }
    } catch (error) {
      MessagePlugin.error('分享失败')
    }
  }

  // 处理分享
  const handleShare = file => {
    selectedFile.value = file
    shareForm.value = {
      expireTime: 7,
      codeType: 'random',
      code: generateRandomCode()
    }
    shareDialogVisible.value = true
  }

  // 确认分享
  const onShareConfirm = async () => {
    try {
      const { data } = await axios.post(`/api/files/${selectedFile.value._id}/share`, {
        expireTime: shareForm.value.expireTime,
        code: shareForm.value.code
      })
      MessagePlugin.success('分享成功')
      // 复制分享链接到剪贴板
      const shareUrl = `${window.location.origin}/share/${data.shareId}`
      await navigator.clipboard.writeText(shareUrl)
      MessagePlugin.success('分享链接已复制到剪贴板')
    } catch (error) {
      MessagePlugin.error('分享失败')
    } finally {
      shareDialogVisible.value = false
    }
  }

  // 处理文件上传
  const handleUpload = () => {
    uploadDialogVisible.value = true
    uploadFiles.value = []
  }

  const onUploadFile = async (files, context) => {
    uploadFiles.value = context.currentSelectedFiles
    if (uploadFiles.value.length === 0) {
      MessagePlugin.error('请选择要上传的文件')
      return false
    }
    try {
      for (const file of uploadFiles.value) {
        const formData = new FormData()
        formData.append('file', file.raw)
        if (parentId.value) {
          formData.append('parentId', parentId.value)
        }
        try {
          await axios.post('/api/files/upload', formData)
          file.status = 'success'
        } catch (error) {
          file.status = 'fail'
        }
      }
      await loadFiles(parentId.value)
    } catch (error) {
      MessagePlugin.error('上传文件失败')
    }
  }

  // 处理文件下载
  const handleDownload = async file => {
    try {
      const { data } = await axios.post(`/api/files/download/${file._id}`)
      saveAs(data.url, data.filename)
    } catch (error) {
      MessagePlugin.error('下载失败')
    }
  }

  // 处理文件删除
  const handleDelete = async file => {
    try {
      await axios.delete(`/api/files/${file._id}`)
      MessagePlugin.success('删除成功')
      await loadFiles(parentId.value)
    } catch (error) {
      MessagePlugin.error('删除失败')
    }
  }

  // 处理搜索
  const handleSearch = async () => {
    if (!searchKeyword.value) {
      await loadFiles(parentId.value)
      return
    }

    loading.value = true
    try {
      const { data } = await axios.get('/api/files/search', {
        params: {
          keyword: searchKeyword.value
        }
      })
      files.value = data
      MessagePlugin.success('搜索完成')
    } catch (error) {
      console.log(error)
      MessagePlugin.error('搜索失败')
    } finally {
      loading.value = false
    }
  }

  // 处理右键菜单
  const onContextMenu = (event, row) => {
    proxy.$contextmenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          label: '打开',
          icon: 'folder',
          onClick: () => {
            if (row.isFolder) {
              navigateTo(row._id)
            }
          },
          disabled: !row.isFolder
        },
        {
          label: '下载',
          icon: 'download',
          onClick: () => handleDownload(row),
          disabled: row.isFolder
        },
        {
          label: '分享',
          icon: 'share',
          onClick: () => handleShare(row)
        },
        {
          label: '复制',
          icon: 'copy',
          onClick: () => handleCopy(row)
        },
        {
          label: '移动',
          icon: 'move',
          onClick: () => handleMove(row)
        },
        {
          label: '重命名',
          icon: 'edit',
          onClick: () => handleRename(row)
        },
        {
          label: '删除',
          icon: 'delete',
          onClick: () => handleDelete(row)
        }
      ]
    })
  }

  // 处理复制
  const handleCopy = async file => {
    try {
      await axios.post(`/api/files/${file._id}/copy`)
      await loadFiles(parentId.value)
      MessagePlugin.success('复制成功')
    } catch (error) {
      MessagePlugin.error('复制失败')
    }
  }

  // 处理移动
  const handleMove = async file => {
    moveDialogVisible.value = true
    selectedFile.value = file
  }

  // 确认移动
  const onMoveConfirm = async () => {
    if (!selectedFolder.value) {
      MessagePlugin.warning('请选择目标文件夹')
      return
    }

    try {
      await axios.post(`/api/files/${selectedFile.value._id}/move`, {
        targetFolderId: selectedFolder.value
      })
      MessagePlugin.success('移动成功')
      await loadFiles(parentId.value)
    } catch (error) {
      MessagePlugin.error('移动失败')
    } finally {
      moveDialogVisible.value = false
    }
  }

  // 处理重命名
  const handleRename = async file => {
    newFileName.value = file.originalName
    renameDialogVisible.value = true
    selectedFile.value = file
  }

  // 确认重命名
  const onRenameConfirm = async () => {
    try {
      await axios.post(`/api/files/${selectedFile.value._id}/rename`, {
        newName: newFileName.value
      })
      MessagePlugin.success('重命名成功')
      await loadFiles(parentId.value)
    } catch (error) {
      MessagePlugin.error('重命名失败')
    } finally {
      renameDialogVisible.value = false
    }
  }

  // 获取文件夹树
  const folderTree = computed(() => {
    const buildTree = (files, parentId = null) => {
      return files
        .filter(file => file.isFolder && file.parent === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(files, folder._id)
        }))
    }
    return buildTree(files.value)
  })

  // 处理文件夹选择
  const handleFolderSelect = value => {
    selectedFolder.value = value
  }

  // 加载文件列表
  const loadFiles = async (folderId = null) => {
    loading.value = true
    try {
      const { data } = await axios.post('/api/files/list', {
        parentId: folderId
      })
      files.value = data
      parentId.value = folderId
    } catch (error) {
      MessagePlugin.error('加载文件列表失败')
    } finally {
      loading.value = false
    }
  }

  // 处理创建文件夹
  const handleCreateFolder = () => {
    folderDialogVisible.value = true
    newFolderName.value = ''
  }

  // 确认创建文件夹
  const onCreateFolder = async () => {
    if (!newFolderName.value) {
      MessagePlugin.warning('请输入文件夹名称')
      return
    }

    try {
      await axios.post('/api/files/folder', {
        name: newFolderName.value,
        parentId: parentId.value
      })
      MessagePlugin.success('创建成功')
      await loadFiles(parentId.value)
    } catch (error) {
      MessagePlugin.error('创建失败')
    } finally {
      folderDialogVisible.value = false
    }
  }

  // 导航到指定文件夹
  const navigateTo = async folderId => {
    if (folderId) {
      const folder = files.value.find(f => f._id === folderId)
      if (folder) {
        currentPath.value.push(folder)
      }
    } else {
      currentPath.value = []
    }
    await loadFiles(folderId)
  }

  // 格式化文件大小
  const formatFileSize = size => {
    if (size === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化日期
  const formatDate = date => {
    return new Date(date).toLocaleString()
  }

  onMounted(() => {
    loadFiles()
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

  .vue-context-menu {
    background: white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: 4px 0;
  }

  .vue-context-menu-item {
    padding: 8px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .vue-context-menu-item:hover {
    background: #f5f5f5;
  }

  .vue-context-menu-item.disabled {
    color: #999;
    cursor: not-allowed;
  }

  .custom-input {
    width: 80%;
    margin-right: 10px;
  }
</style>
