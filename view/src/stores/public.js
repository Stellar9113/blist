import { MessagePlugin } from 'tdesign-vue-next'
import ClipboardJS from 'clipboard'

// 复制链接
export const copy = text => {
  // 创建一个临时的按钮元素
  const button = document.createElement('button')
  button.style.display = 'none'
  document.body.appendChild(button)

  const clipboard = new ClipboardJS(button, {
    text: () => text
  })

  clipboard.on('success', e => {
    e.clearSelection()
    MessagePlugin.success('链接已复制到剪贴板')
    clipboard.destroy()
    document.body.removeChild(button)
  })

  clipboard.on('error', () => {
    MessagePlugin.error('复制失败, 请检查当前浏览器是否支持Clipboard.js')
    clipboard.destroy()
    document.body.removeChild(button)
  })

  // 触发点击事件
  button.click()
}
