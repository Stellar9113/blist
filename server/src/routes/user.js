import express from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.js'
import { auth } from '../middleware/auth.js'

// 生成JWT token
const generateToken = userId => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const router = express.Router()

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // 检查用户是否已存在
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已被使用' })
    }

    // 检查是否是第一个用户
    const userCount = await User.countDocuments()
    const role = userCount === 0 ? 'admin' : 'user'

    const user = new User({
      username,
      email,
      password,
      role // 设置用户角色
    })

    await user.save()

    const token = generateToken(user._id)
    res.status(201).json({ user, token })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await User.findOne({ username })

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    const token = generateToken(user._id)
    res.json({ user, token })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/profile', auth, async (req, res) => {
  res.json(req.user)
})

export default router
