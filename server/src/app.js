import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { Config } from './models/config.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import fileRoutes from './routes/file.js'
import configRoutes from './routes/config.js'

// 加载环境变量
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 创建Express应用
const app = express()

// 中间件
app.use(
  cors({
    origin: true,
    credentials: true
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static('uploads'))
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/admin', configRoutes)

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')))

// 所有未匹配的路由都返回前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})
// 错误处理
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: Object.values(err.errors).map(error => error.message)
    })
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '无效的token'
    })
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'token已过期'
    })
  }
  res.status(500).json({
    error: err.message || '服务器内部错误'
  })
})

// 数据库连接配置
const connectDB = async () => {
  const maxRetries = 5
  let retries = 0

  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // 超时时间
        socketTimeoutMS: 45000 // Socket 超时时间
      })
      console.log('MongoDB数据库连接成功')
      // 初始化配置
      await Config.initialize()
      return
    } catch (error) {
      retries++
      console.log(`MongoDB连接尝试${retries}失败：`, error.message)
      if (retries === maxRetries) {
        console.error(`在${maxRetries}次尝试后连接到MongoDB失败`)
        throw error
      }
      // 等待 5 秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
}

// 启动服务器
const startServer = async () => {
  try {
    await connectDB()
    // 等待数据库连接成功后再执行初始化
    app.listen(process.env.PORT, () => {
      console.log(`后端服务正在${process.env.PORT}端口上运行`)
    })
  } catch (error) {
    console.error('启动后端服务失败：', error)
    process.exit(1)
  }
}

startServer()
