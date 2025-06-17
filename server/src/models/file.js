import mongoose from 'mongoose'

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    // required: true
  },
  size: {
    type: Number,
    required: true,
    default: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isFolder: {
    type: Boolean,
    default: false
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isShared: {
    type: Boolean,
    default: false
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
})

export const File = mongoose.model('File', fileSchema)
