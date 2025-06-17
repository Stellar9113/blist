<template>
  <div class="file-detail">
    <t-card>
      <template #header>
        <t-space>
          <FileIcon />
          <span class="file-name">{{ fileInfo.originalName }}</span>
        </t-space>
      </template>
      <!-- 文件预览区域 -->
      <div class="preview-container" v-if="!fileInfo.isFolder">
        <!-- 图片预览 -->
        <div v-if="isImage" class="image-preview">
          <img :src="previewUrl" :alt="fileInfo.originalName" />
        </div>
        <!-- 视频预览 -->
        <div v-else-if="isVideo" class="video-preview">
          <div id="dplayer" ref="dplayerContainer"></div>
        </div>
        <!-- 音频预览 -->
        <div v-else-if="isAudio" class="audio-preview">
          <audio :src="previewUrl" controls class="audio-player">您的浏览器不支持 HTML5 音频播放</audio>
        </div>
        <!-- PDF预览 -->
        <div v-else-if="isPDF" class="pdf-preview">
          <iframe :src="previewUrl" class="pdf-viewer"></iframe>
        </div>
        <!-- 文本预览 -->
        <div v-else-if="isText" class="text-preview">
          <pre>{{ textContent }}</pre>
        </div>
        <!-- 不支持预览的文件类型 -->
        <div v-else class="unsupported-preview">
          <t-alert theme="warning" message="该文件类型暂不支持预览" />
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed, nextTick, watch, onUnmounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { MessagePlugin } from 'tdesign-vue-next'
  import { FileIcon } from 'tdesign-icons-vue-next'
  import axios from '@/stores/axios'
  import DPlayer from 'dplayer'

  const route = useRoute()
  const router = useRouter()
  const fileInfo = ref({})
  const loading = ref(false)
  const dplayerContainer = ref(null)
  const player = ref(null)

  // 文件类型判断
  const isImage = computed(() => {
    return fileInfo.value.mimeType?.startsWith('image/')
  })

  const isVideo = computed(() => {
    return fileInfo.value.mimeType?.startsWith('video/')
  })

  const isAudio = computed(() => {
    return fileInfo.value.mimeType?.startsWith('audio/')
  })

  const isPDF = computed(() => {
    return fileInfo.value.mimeType === 'application/pdf'
  })

  const isText = computed(() => {
    return (
      fileInfo.value.mimeType?.startsWith('text/') ||
      fileInfo.value.mimeType === 'application/json' ||
      fileInfo.value.mimeType === 'application/javascript'
    )
  })

  // 预览URL
  const previewUrl = ref('')

  // 文本内容
  const textContent = ref('')

  // 加载文本内容
  const loadTextContent = async () => {
    if (isText.value) {
      try {
        const { data } = await axios.get(`/api/files/${fileInfo.value._id}/content`)
        textContent.value = data
      } catch (error) {
        MessagePlugin.error('加载文本内容失败')
      }
    }
  }

  // 初始化视频播放器
  const initPlayer = () => {
    if (player.value) {
      player.value.destroy()
    }

    nextTick(() => {
      if (dplayerContainer.value) {
        player.value = new DPlayer({
          container: dplayerContainer.value,
          video: {
            url: previewUrl.value
          }
        })
      }
    })
  }

  // 监听文件信息变化
  watch(
    () => fileInfo.value,
    newVal => {
      if (newVal && isVideo.value) {
        initPlayer()
      }
    },
    { immediate: true }
  )

  // 加载文件信息
  const loadFileInfo = async () => {
    loading.value = true
    try {
      const { data } = await axios.get(`/api/files/${route.params.id}/preview`)
      fileInfo.value = data
      previewUrl.value = data.path
      await loadTextContent()
    } catch (error) {
      console.log(error)
      MessagePlugin.error('加载文件信息失败')
    } finally {
      loading.value = false
    }
  }

  // 组件卸载时销毁播放器
  onUnmounted(() => {
    if (player.value) {
      player.value.destroy()
    }
  })

  onMounted(() => {
    loadFileInfo()
  })
</script>

<style scoped>
  .file-detail {
    padding: 20px;
  }

  .file-name {
    font-size: 18px;
    font-weight: bold;
  }

  .preview-container {
    width: 100%;
    min-height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
  }

  .image-preview {
    max-width: 100%;
    max-height: 600px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .image-preview img {
    max-width: 100%;
    max-height: 600px;
    object-fit: contain;
  }

  .video-preview {
    width: 100%;
    max-width: 800px;
    min-height: 450px;
  }

  #dplayer {
    width: 100%;
    height: 100%;
  }

  .audio-preview {
    width: 100%;
    max-width: 600px;
  }

  .audio-player {
    width: 100%;
  }

  .pdf-preview {
    width: 100%;
    height: 600px;
  }

  .pdf-viewer {
    width: 100%;
    height: 100%;
    border: none;
  }

  .text-preview {
    width: 100%;
    max-height: 600px;
    overflow: auto;
    background-color: #fff;
    padding: 16px;
    border-radius: 4px;
  }

  .text-preview pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .unsupported-preview {
    padding: 20px;
  }
</style>
