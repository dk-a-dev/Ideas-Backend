import { Request, Response } from 'express'
import mongoose from 'mongoose'

import Comment from '../models/comment'
import Idea from '../models/idea'
import User from '../models/user'
import { IIdea } from '../types/types'
import filterIdeas from '../utils/filterIdeas'

const getAllIdeas = async (req: Request, res: Response) => {
  let ideas

  const offset = req.query?.offset || 0
  const limit = req.query?.limit || 20
  const sortBy = req.query?.sortBy || 'date' // date, title, users given name
  const order = req.query?.order || 'asc' // asc, desc
  const user = req.query?.user || '' // filter by user
  const tags = req.query?.tags || '' // comma separated tags (?tags=tag1,tag2,tag3)`

  console.log({ sortBy, order, user, tags })

  try {
    ideas = await Idea.find().skip(offset as number).limit(limit as number).populate('author', 'picture')
  } catch {
    res.status(502).json({ error: 'Could not retrieve ideas from the database.' })
  }

  ideas = filterIdeas(ideas, sortBy, order, user, tags)

  res.status(200).json({ ideas })
}

const getIdeaById = async (_req: Request, res: Response) => {
  const ideaId = res.locals.ideaId
  try {
    const idea = await Idea.findById(ideaId).populate('author').lean()

    const comments = await Comment.find({
      ideaId,
      parentCommentId: { $exists: false }
    }).populate('author', 'name picture').lean()

    return res.status(200).json({ idea, comments })
  } catch {
    return res.status(500).json({ error: 'Could not find idea.' })
  }
}

const getIdeaByUserId = async (req: Request, res: Response) => {
  const userId = req.params.userId

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Bad request. Invalid user id.' })
  }

  const mongoUserId = new mongoose.Types.ObjectId(userId)

  try {
    const ideas = await Idea.find({
      author: mongoUserId
    }).populate('author', 'name picture').lean()

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
          upvotes: idea.upvotes
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
