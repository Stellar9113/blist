import jwt from 'jsonwebtoken'
import { User } from '../models/user.js'

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      throw new Error()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user) {
      throw new Error()
    }

    req.user = user
    req.token = token
    next()
  } catch (error) {
    res.status(401).json({ error: '请先登录' })
  }
}

export const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' })
    }
    next()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
