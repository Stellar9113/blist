import express from 'express'
import { auth, isAdmin } from '../middleware/auth.js'
import { Config } from '../models/config.js'

const router = express.Router()

// 获取系统配置
router.post('/config', auth, isAdmin, async (req, res) => {
  try {
    await Config.initialize()
    let config = await Config.findOne()
    const { _id, __v, ...configWithoutId } = config.toObject()
    res.json(configWithoutId)
  } catch ({ message }) {
    res.status(500).json({ error: message })
  }
})

// 更新系统配置
router.put('/config', auth, isAdmin, async (req, res) => {
  try {
    await Config.findOneAndUpdate({}, { $set: req.body }, { new: true, upsert: true })
    res.status(200).json({ message: '站点配置保存成功' })
  } catch ({ message }) {
    res.status(500).json({ error: message })
  }
})

export default router
