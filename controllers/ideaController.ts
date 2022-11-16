import { Request, Response } from 'express'
import mongoose from 'mongoose'

import Comment from '../models/comment'
import Idea from '../models/idea'
import { User } from '../models/user'
import { IIdea } from '../types/types'
import filterIdeas from '../utils/filterIdeas'

const getAllIdeas = async (req: Request, res: Response) => {
  let ideas

  const sortBy = req.query?.sortBy || 'date' // date, title, users given name, upvotes
  const order = req.query?.order || 'asc' // asc, desc
  const user = req.query?.user || '' // filter by user
  const tags = req.query?.tags || '' // comma separated tags (?tags=tag1,tag2,tag3)`
  const query = req.query?.query || '' // the search query
  const realOffset = req.query?.offset || 0
  const realLimit = req.query?.limit || 20
  let offset = req.query?.offset || 0
  let limit = req.query?.limit || 20
  if (query !== '') {
    offset = 0
    limit = 1000
  }
  const trending = req.query?.trending || 'false'
  const madeReal = req.query?.madeReal || 'false'

  let startDate
  try {
    startDate = req.query?.startDate || new Date(1629523280 * 1000)
    startDate = new Date(startDate as string)
  } catch {
    return res.status(400).json({ error: 'Bad request, invalid start date.' })
  }

  let endDate
  try {
    endDate = req.query?.endDate || Date.now()
    endDate = new Date(endDate as string)
    endDate = endDate.setDate(endDate.getDate() + 1)
  } catch {
    return res.status(400).json({ error: 'Bad request, invalid end date.' })
  }

  console.log(endDate.toString())

  try {
    if (trending === 'true') {
      ideas = await Idea.find({ approved: true }).limit(20).populate('author', 'picture').lean()
    } else if (madeReal === 'true') {
      ideas = await Idea.find({ madeReal: true }).limit(20).populate('author', 'picture').lean()
    } else if (tags.length) {
      ideas = await Idea.find({ approved: true, createdOn: { $gte: startDate, $lte: endDate }, tags: { $all: (tags as string).split(',') } }).sort('1').skip(offset as number).limit(limit as number).populate('author', 'picture').lean()
    } else {
      ideas = await Idea.find({ approved: true, createdOn: { $gte: startDate, $lte: endDate } }).sort({ createdOn: -1 }).skip(offset as number).limit(limit as number).populate('author', 'picture').lean()
    }
  } catch {
    return res.status(502).json({ error: 'Could not retrieve ideas from the database.' })
  }

  const filtered = filterIdeas(ideas, sortBy, order, user, tags, query, trending, madeReal, realOffset, realLimit)
  return res.status(200).json({ ideas: filtered?.ideas, searchResults: filtered?.matches })
}

const getIdeaById = async (req: Request, res: Response) => {
  const ideaId = res.locals.ideaId

  const editing = req.query?.edit || 'false'

  try {
    let idea
    if (editing === 'true') {
      idea = await Idea.findById(ideaId).lean()
      return res.status(200).json({ idea })
    } else {
      idea = await Idea.findById(ideaId).populate('author').lean()
      const comments = await Comment.find({
        ideaId,
        parentCommentId: { $exists: false }
      }).populate('author', 'name picture').lean()

      return res.status(200).json({ idea, comments })
    }
  } catch {
    return res.status(500).json({ error: 'Could not find idea.' })
  }
}

interface ideaWithComments extends IIdea{
  comments: Comment[]
}

const getIdeaByUserId = async (req: Request, res: Response) => {
  const userId = req.params.userId

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Bad request. Invalid user id.' })
  }

  const mongoUserId = new mongoose.Types.ObjectId(userId)

  try {
    let ideas: ideaWithComments[] = await Idea.find({
      author: mongoUserId,
      approved: true
    }).populate('author', 'name picture').lean()

    ideas = await Promise.all(ideas.map(async (idea) => {
      idea.comments = await Comment.find({ ideaId: idea._id }).populate('author', '_id name picture')
      return idea
    }))

    return res.status(200).json({ ideas })
  } catch {
    return res.status(500).json({ error: 'Could not fetch ideas.' })
  }
}

interface reqIdea {
  _id?: string
  title: string
  description: string
  tags?: string[]
  upvotes?: any
  downvotes?: any
  comments?: any
}

const createIdea = async (req: Request, res: Response) => {
  const userId: string = res.locals.user.id || ''
  const userName: string = res.locals.user.name || ''

  let user

  try {
    user = await User.exists({ _id: userId })
  } catch {
    return res.status(500).json({ error: 'Internal error, could not verify user.' })
  }

  if (user === null) {
    return res.status(404).json({ error: 'Unauthorized. User Does not exist.' })
  }

  try {
    const idea: reqIdea = req.body.idea

    if (!idea.title) {
      return res.status(400).json({ error: 'Bad request. Title of the idea is missing.' })
    }
    idea.title = idea.title.trim()

    if (!idea.description) {
      return res.status(400).json({ error: 'Bad request. Description of the idea is missing.' })
    }
    idea.description = idea.description.trim()

    try {
      if (idea.tags) {
        idea.tags = idea.tags.map(tag => {
          return tag.trim().toLowerCase()
        })
      }
    } catch {
      return res.status(400).json({ error: 'Bad request. Error parsing idea tags.' })
    }

    idea.downvotes = []
    idea.upvotes = [userId]

    try {
      const createdIdea = await new Idea({
        author: userId,
        authorName: userName,
        title: idea.title,
        description: idea.description,
        upvotes: idea.upvotes,
        downvotes: idea.downvotes,
        tags: idea.tags,
        approved: false,
        rejected: false,
        createdOn: Date.now()
      }).save()

      return res.status(200).json({ idea: createdIdea, message: 'Idea created successfully.' })
    } catch {
      return res.status(502).json({ error: 'Error inserting idea in the database.' })
    }
  } catch {
    return res.status(400).json({ error: 'Bad request. Request body does not have an idea.' })
  }
}

const editIdea = async (req: Request, res: Response) => {
  const userId: string = res.locals.user.id || ''
  const ideaId: string = res.locals.ideaId || ''
  const theIdea: IIdea | null = await Idea.findById(ideaId)
  if (theIdea === null) {
    return res.status(404).json({ error: `Idea with ideaId ${ideaId} not found.` })
  }

  if (theIdea.author.equals(userId)) {
    const idea: reqIdea = req.body.idea
    if (!idea.title) {
      return res.status(400).json({ error: 'Bad request. Title of the idea is missing' })
    }
    idea.title = idea.title.trim()

    if (!idea.description) {
      return res.status(400).json({ error: 'Bad request. Description of the idea is missing' })
    }
    idea.description = idea.description.trim()

    try {
      if (idea.tags) {
        idea.tags = idea.tags.map(tag => {
          return tag.trim().toLowerCase()
        })
      }
    } catch {
      return res.status(400).json({ error: 'Bad request. Error parsing idea tags.' })
    }

    idea.downvotes = []
    idea.upvotes = [userId]

    try {
      const result = await Idea.updateOne({
        _id: ideaId
      }, {
        $set: {
          title: idea.title,
          description: idea.description,
          downvotes: idea.downvotes,
          upvotes: idea.upvotes,
          tags: idea.tags
        }
      })

      const newIdea = await Idea.findById({ _id: ideaId })

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Idea not found' })
      } else if (result.modifiedCount === 1) {
        return res.status(200).json({ message: 'Successfully edited idea.', idea: newIdea })
      } else if (result.modifiedCount === 0) {
        return res.status(304).end()
      } else {
        return res.status(500).json({ error: 'Idea could not be edited' })
      }
    } catch {
      return res.status(500).json({ error: 'Could not update idea' })
    }
  }

  return res.status(404).json({ error: 'Unauthorized. You cannot edit an idea created by someone else.' })
}

const deleteIdea = async (req: Request, res: Response) => {
  const userId: string = res.locals.user.id || ''
  const ideaId: string = res.locals.ideaId || ''

  const theIdea: IIdea | null = await Idea.findById(ideaId)

  if (theIdea === null) {
    return res.status(404).json({ error: `Idea with ideaId ${ideaId} not found.` })
  } else {
    if (theIdea.author.equals(userId)) {
      try {
        await Idea.deleteOne({ _id: ideaId })
        await Comment.deleteMany({ ideaId })
        return res.status(200).json({ message: 'Deleted Idea' })
      } catch {
        return res.status(500).json({ error: 'Could not delete Idea.' })
      }
    }

    return res.status(401).json({ error: 'Unauthorized. You cannot delete an idea created by someone else.' })
  }
}

const resetVote = async (mongoUserId: string, mongoIdeaId: string) => {
  return await Idea.updateOne({ _id: mongoIdeaId }, {
    $pull: {
      upvotes: mongoUserId,
      downvotes: mongoUserId
    }
  })
}

const voteIdea = async (req: Request, res: Response) => {
  const userId: string = res.locals.user.id || ''
  const ideaId: string = res.locals.ideaId || ''

  try {
    let voteType = req.body.voteType

    if (typeof voteType === 'string') {
      voteType = parseInt(voteType)
    }

    let theIdea: IIdea | null

    switch (voteType) {
      case 0:
        await resetVote(userId, ideaId)
        theIdea = await Idea.findById(ideaId)
        return res.status(200).json({ message: 'Removed upvote/downvote', idea: theIdea })

      case 1:
        await resetVote(userId, ideaId)
        await Idea.updateOne({ _id: ideaId }, {
          $push: {
            upvotes: userId
          }
        })
        theIdea = await Idea.findById(ideaId)
        return res.status(200).json({ message: 'Added upvote', idea: theIdea })

      case 2:
        await resetVote(userId, ideaId)
        await Idea.updateOne({ _id: ideaId }, {
          $push: {
            downvotes: userId
          }
        })
        theIdea = await Idea.findById(ideaId)
        return res.status(200).json({ message: 'Added downvote', idea: theIdea })

      default:
        return res.status(400).json({ error: 'Bad request. Invalid voteType.' })
    }
  } catch {
    return res.status(404).json({ error: `Idea with id ${ideaId} not found.` })
  }
}

export {
  getAllIdeas,
  getIdeaById,
  getIdeaByUserId,
  createIdea,
  editIdea,
  deleteIdea,
  voteIdea
}
