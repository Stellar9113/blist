import express from 'express'
import { auth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { Config } from '../models/config.js'
import { File } from '../models/file.js'
import { User } from '../models/user.js'
import fs from 'fs/promises'
import path from 'path'
import { Share } from '../models/share.js'

const router = express.Router()

// 所有文件路由都需要认证
router.use(auth)

// 更新文件夹大小
const updateFolderSize = async (folderId, sizeChange) => {
  if (!folderId) return

  const folder = await File.findById(folderId)
  if (!folder) return

  folder.size = (folder.size || 0) + sizeChange
  await folder.save()

  // 递归更新父文件夹
  if (folder.parent) {
    await updateFolderSize(folder.parent, sizeChange)
  }
}

// 上传文件
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件被上传' })
    }
    const { site } = await Config.findOne()
    if (!site.url) {
      return res.status(400).json({ error: '站点URL没有配置' })
    }
    const { parentId } = req.body
    const file = new File({
      name: req.file.filename,
      originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      owner: req.user._id,
      parent: parentId || null
    })
    await file.save()
    // 更新父文件夹大小
    if (file.parent) {
      await updateFolderSize(file.parent, file.size)
    }
    // 更新用户存储使用量
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: req.file.size }
    })
    res.status(200).json(file)
  } catch ({ message }) {
    console.log(error)
    res.status(400).json({ error: message })
  }
})

// 获取文件列表
router.post('/list', async (req, res) => {
  try {
    const { parentId } = req.body
    const files = await File.find({
      owner: req.user._id,
      parent: parentId || null
    })
      .sort({ createdAt: -1 })
      .lean()
      .populate('sharedBy', 'username')
    res.json(files)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 删除文件
router.delete('/:id', async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id
    })

    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限删除此文件' })
    }
    // 如果是文件夹，需要递归删除所有子文件和子文件夹
    if (file.isFolder) {
      const children = await File.find({ parent: file._id })
      for (const child of children) {
        if (child.isFolder) {
          await File.findByIdAndDelete(child._id)
        } else {
          fs.unlink(child.path)
          await File.findByIdAndDelete(child._id)
        }
      }
    } else {
      // 删除物理文件
      fs.unlink(file.path)
    }

    // 更新父文件夹大小
    if (file.parent) {
      await updateFolderSize(file.parent, -file.size)
    }

    // 更新用户存储使用量
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: -file.size }
    })

    // 删除数据库记录
    await file.deleteOne()

    res.json({ message: '文件删除成功' })
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 创建文件夹
router.post('/folder', async (req, res) => {
  try {
    const { name, parentId } = req.body
    const folder = new File({
      name,
      originalName: name,
      path: '',
      size: 0,
      mimeType: 'folder',
      owner: req.user._id,
      isFolder: true,
      parent: parentId || null
    })

    await folder.save()
    res.status(201).json(folder)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 文件下载
router.get('/:id/download', async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id
    })

    if (!file || file.isFolder) {
      return res.status(404).json({ error: '文件不存在' })
    }

    res.download(file.path, file.originalName)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 搜索文件
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query
    const query = {
      owner: req.user._id,
      originalName: { $regex: keyword, $options: 'i' }
    }

    const files = await File.find(query).sort({ createdAt: -1 })
    res.json(files)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 获取共享文件列表
router.post('/shared', async (req, res) => {
  try {
    const files = await File.find({
      isShared: true,
      $or: [
        { owner: req.user._id }, // 自己共享的文件
        { sharedBy: req.user._id } // 别人共享给自己的文件
      ]
    })
      .sort({ createdAt: -1 })
      .lean()
      .populate('owner', 'username') // 获取文件所有者信息
      .populate('sharedBy', 'username') // 获取共享者信息

    res.json(files)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 获取最近文件列表
router.post('/recent', async (req, res) => {
  try {
    const files = await File.find({
      owner: req.user._id,
      isFolder: false // 只返回文件，不返回文件夹
    })
      .sort({ lastAccessed: -1 })
      .limit(20) // 限制返回最近20个文件
      .lean()

    res.json(files)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 分享文件
router.post('/:id/share', async (req, res) => {
  try {
    const { expireTime, code } = req.body
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限分享此文件' })
    }

    // 创建分享记录
    const share = new Share({
      file: file._id,
      owner: req.user._id,
      code,
      expireTime: expireTime === -1 ? null : new Date(Date.now() + expireTime * 24 * 60 * 60 * 1000)
    })

    await share.save()
    res.json({ shareId: share._id })
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 取消共享
router.post('/:id/unshare', async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限取消共享此文件' })
    }

    file.isShared = false
    file.sharedBy = null
    await file.save()

    res.json(file)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 更新文件访问时间
const updateLastAccessed = async fileId => {
  await File.findByIdAndUpdate(fileId, {
    lastAccessed: new Date()
  })
}

// 下载接口
router.post('/download/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }
    const { site } = await Config.findOne()
    if (!site.url) {
      return res.status(400).json({ error: '站点URL没有配置' })
    }
    // 检查权限
    if (
      file.owner.toString() !== req.user._id.toString() &&
      !(file.isShared && file.sharedBy.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({ error: '没有权限下载此文件' })
    }

    // 更新最后访问时间
    await updateLastAccessed(file._id)

    res.status(200).json({
      url: `${site.url}/${file.path}`,
      filename: file.originalName
    })
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 重命名文件
router.post('/:id/rename', async (req, res) => {
  try {
    const { newName } = req.body
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限重命名此文件' })
    }
    file.originalName = newName
    await file.save()

    res.json(file)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 移动文件
router.post('/:id/move', async (req, res) => {
  try {
    const { targetFolderId } = req.body
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限移动此文件' })
    }

    // 检查目标文件夹是否存在
    if (targetFolderId) {
      const targetFolder = await File.findById(targetFolderId)
      if (!targetFolder || !targetFolder.isFolder) {
        return res.status(400).json({ error: '目标文件夹不存在' })
      }
    }

    // 更新父文件夹大小
    if (file.parent) {
      await updateFolderSize(file.parent, -file.size)
    }
    if (targetFolderId) {
      await updateFolderSize(targetFolderId, file.size)
    }

    file.parent = targetFolderId
    await file.save()

    res.json(file)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 复制文件
router.post('/:id/copy', async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限复制此文件' })
    }

    // 创建文件副本
    const fileCopy = new File({
      name: `${file.name} (复制)`,
      originalName: `${file.originalName} (复制)`,
      path: file.path,
      size: file.size,
      mimeType: file.mimeType,
      owner: req.user._id,
      parent: file.parent,
      isFolder: file.isFolder
    })

    await fileCopy.save()

    // 更新父文件夹大小
    if (fileCopy.parent) {
      await updateFolderSize(fileCopy.parent, fileCopy.size)
    }

    res.json(fileCopy)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 获取分享信息
router.get('/share/:id', async (req, res) => {
  try {
    const share = await Share.findById(req.params.id).populate('file').populate('owner', 'username')

    if (!share) {
      return res.status(404).json({ error: '分享不存在' })
    }

    // 检查是否过期
    if (share.expireTime && share.expireTime < new Date()) {
      return res.status(400).json({ error: '分享已过期' })
    }

    // 如果是文件夹，需要获取所有子文件
    if (share.file.isFolder) {
      const children = await File.find({ parent: share.file._id })
      const fileData = share.file.toObject()
      fileData.children = children
      res.json({
        ...fileData,
        owner: share.owner.username,
        code: share.code
      })
    } else {
      res.json({
        ...share.file.toObject(),
        owner: share.owner.username,
        code: share.code
      })
    }
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 验证提取码
router.post('/share/:id/verify', async (req, res) => {
  try {
    const { code } = req.body
    const share = await Share.findById(req.params.id).populate('file').populate('owner', 'username')

    if (!share) {
      return res.status(404).json({ error: '分享不存在' })
    }

    if (share.code !== code) {
      return res.status(400).json({ error: '提取码错误' })
    }

    res.json({
      ...share.file.toObject(),
      owner: share.owner.username
    })
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 下载分享文件
router.post('/share/:id/download', async (req, res) => {
  try {
    const share = await Share.findById(req.params.id).populate('file')
    if (!share) {
      return res.status(404).json({ error: '分享不存在' })
    }
    const { site } = await Config.findOne()
    if (!site.url) {
      return res.status(400).json({ error: '站点URL没有配置' })
    }

    res.status(200).json({
      url: `${site.url}/${share.file.path}`,
      filename: share.file.originalName
    })
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 保存分享文件到我的文件
router.post('/share/:id/save', auth, async (req, res) => {
  try {
    const share = await Share.findById(req.params.id).populate('file')
    if (!share) {
      return res.status(404).json({ error: '分享不存在' })
    }

    // 创建文件副本
    const fileCopy = new File({
      name: share.file.name,
      originalName: share.file.originalName,
      path: share.file.path,
      size: share.file.size,
      mimeType: share.file.mimeType,
      owner: req.user._id,
      isFolder: share.file.isFolder
    })

    await fileCopy.save()
    res.json(fileCopy)
  } catch ({ message }) {
    res.status(400).json({ error: message })
  }
})

// 获取文件预览
router.get('/:id/preview', async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }

    // 检查权限
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限访问此文件' })
    }

    const { site } = await Config.findOne()
    if (!site.url) {
      return res.status(400).json({ error: '站点URL没有配置' })
    }

    // 如果是图片、视频、音频或PDF，直接发送文件
    if (
      file.mimeType.startsWith('image/') ||
      file.mimeType.startsWith('video/') ||
      file.mimeType.startsWith('audio/') ||
      file.mimeType === 'application/pdf'
    ) {
      file.path = `${site.url}/${file.path.replace('\\', '/')}`
      return res.status(200).json(file)
    } else {
      res.status(400).json({ error: '不支持预览此类型的文件' })
    }
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// 获取视频封面
router.get('/:id/poster', async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
    if (!file || !file.mimeType.startsWith('video/')) {
      return res.status(404).json({ error: '文件不存在或不是视频文件' })
    }

    // 检查权限
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限访问此文件' })
    }

    // 这里可以使用 ffmpeg 生成视频封面
    // 暂时返回一个默认图片
    res.sendFile(path.join(__dirname, '../public/default-video-poster.jpg'))
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// 获取文本内容
router.get('/:id/content', async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: '文件不存在' })
    }

    // 检查权限
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: '没有权限访问此文件' })
    }

    // 检查是否是文本文件
    if (
      !file.mimeType.startsWith('text/') &&
      file.mimeType !== 'application/json' &&
      file.mimeType !== 'application/javascript'
    ) {
      return res.status(400).json({ error: '不是文本文件' })
    }

    // 读取文件内容
    const content = await fs.readFile(file.path, 'utf-8')
    res.json(content)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
