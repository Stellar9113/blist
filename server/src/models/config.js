import mongoose from 'mongoose'

const configSchema = new mongoose.Schema(
  {
    // 网站配置
    site: {
      // 网站标题
      title: {
        type: String,
        default: 'Blist'
      },
      // 网站url
      url: {
        type: String,
        default: ''
      }
    }
  },
  { timestamps: true }
)

// 确保至少有一个配置文档
configSchema.statics.initialize = async function () {
  const count = await this.countDocuments()
  if (count === 0) {
    await this.create({})
  }
}

export const Config = mongoose.model('Config', configSchema)
