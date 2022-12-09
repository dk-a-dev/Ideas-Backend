import mongoose from 'mongoose'
import { IIdea } from '../types/types'
import Tag from './tags'
import { User } from './user'

const Schema = mongoose.Schema

const ideaSchema = new Schema<IIdea>({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },

  authorName: {
    type: String,
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  upvotes: [mongoose.Schema.Types.ObjectId],

  downvotes: [mongoose.Schema.Types.ObjectId],

  tags: [String],

  gitLinks: {
    type: [String],
    default: [],
    required: true
  },

  deployedURLs: {
    type: [String],
    default: [],
    required: true
  },

  status: {
    type: String,
    default: 'pending'
  },
  madeReal: {
    type: Boolean,
    default: false,
    required: true
  },
  createdOn: Date
}, {
  versionKey: false
})

ideaSchema.post('save', async (doc: mongoose.Document & IIdea) => {
  if (doc?.tags.length) {
    doc?.tags.forEach(async tag => {
      if (!(await Tag.exists({ tag }))) {
        try {
          await new Tag({ tag }
          ).save()
        } catch {
          console.error(`Could not save tag ${tag}`)
        }
      }
    })
  }
  await User.findByIdAndUpdate({ _id: doc?.author?._id }, { $inc: { ideaCount: 1 } })
})

const Idea = mongoose.model('idea', ideaSchema)

export default Idea
