import express from 'express'
import { Config } from '../models/config.js'

const router = express.Router()

// 获取站点配置
router.post('/config', async (req, res) => {
  try {
    let config = await Config.findOne()
    if (!config) {
      return res.status(404).json({ error: config })
    }
    const { site } = config
    res.json({
      site
    })
  } catch ({ message }) {
    res.status(500).json({ error: message })
  }
})

export default router
