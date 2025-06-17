<template>
  <div class="settings-page">
    <t-card title="站点设置">
      <t-form ref="form" :data="formData" @submit="onSubmit">
        <t-form-item label="站点名称" name="title">
          <t-input v-model="formData.site.title" placeholder="请输入站点名称" />
        </t-form-item>
        <t-form-item label="站点URL" name="url">
          <t-input v-model="formData.site.url" placeholder="请输入站点URL" />
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit">保存设置</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { MessagePlugin } from 'tdesign-vue-next'
  import axios from '@/stores/axios'

  const form = ref(null)
  const formData = ref({
    site: {}
  })

  // 加载设置
  const loadSettings = async () => {
    try {
      const { data } = await axios.post('/api/admin/config')
      formData.value = data
    } catch (error) {
      MessagePlugin.error('加载设置失败')
    }
  }

  // 提交表单
  const onSubmit = async ({ validateResult }) => {
    if (validateResult === true) {
      try {
        await axios.put('/api/admin/config', formData.value)
        MessagePlugin.success('保存成功')
      } catch (error) {
        MessagePlugin.error('保存失败')
      }
    }
  }

  onMounted(() => {
    loadSettings()
  })
</script>

<style scoped>
  .settings-page {
    padding: 20px;
  }
</style>
