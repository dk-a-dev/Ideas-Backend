import { Request, Response } from 'express'
import mongoose from 'mongoose'

import Comment from '../models/comment'
import Idea from '../models/idea'
import { User } from '../models/user'
import { IIdea } from '../types/types'
import fuzzysort from 'fuzzysort'

const getAllIdeas = async (req: Request, res: Response) => {
  let ideas

  const sortBy = req.query?.sortBy || 'date' // date, title, users given name, upvotes
  const order = req.query?.order || 'asc' // asc, desc
  const _user = req.query?.user || '' // filter by user
  const _tags = req.query?.tags || '' // comma separated tags (?tags=tag1,tag2,tag3)`
  const madeReal = req.query?.madeReal

  const _offset = req.query?.offset || 0
  const _limit = req.query?.limit || 20
  const offset: number = _offset as number
  const limit: number = _limit as number
  const _query = req.query?.query || '' // search query
  let query: string = _query as string
  const user = _user as string
  const tags = _tags as string

  const _startDate = req.query?.startDate || new Date(1629523280 * 1000)
  let startDate: Date = _startDate as Date
  try {
    startDate = new Date(_startDate as string)
  } catch {
    return res.status(400).json({ error: 'Bad request, invalid start date.' })
  }

  const _endDate = req.query?.endDate || Date.now()
  let endDate: Date = _endDate as unknown as Date
  try {
    endDate = new Date(_endDate as string)
    endDate = endDate.setDate(endDate.getDate() + 1) as unknown as Date
  } catch {
    return res.status(400).json({ error: 'Bad request, invalid end date.' })
  }
  let results
  try {
    if (madeReal === 'true') {
      ideas = await Idea.find({
        status: 'approved',
        madeReal: true
      })
    } else if (madeReal === 'false') {
      ideas = await Idea.find({
        status: 'approved',
        madeReal: false
      }).populate('author', 'picture name')
    } else {
      ideas = await Idea.find({ $or: [{ madeReal: true }, { status: 'approved' }] }).populate('author', 'picture name')
    }
    if (sortBy === 'date') {
      ideas = ideas.sort((a: IIdea, b: IIdea) => {
        return a.createdOn.getTime() - b.createdOn.getTime()
      })
    } else if (sortBy === 'title') {
      ideas = ideas.sort((a: IIdea, b: IIdea) => {
        return a.title.localeCompare(b.title)
      })
    } else if (sortBy === 'upvotes') {
      ideas = ideas.sort((a: IIdea, b: IIdea) => {
        return a.upvotes.length - b.upvotes.length
      })
    } else if (sortBy === 'downvotes') {
      ideas = ideas.sort((a: IIdea, b: IIdea) => {
        return a.downvotes.length - b.downvotes.length
      })
    }
    // else if (sortBy === 'user') {
    //   ideas = ideas.sort((a: IIdea, b: IIdea) => {
    //     return a.authorName.localeCompare(b.authorName)
    //   })
    // }

    if (order !== 'desc') {
      ideas = ideas.reverse()
    }

    if (user !== '') {
      ideas = ideas.filter((idea: IIdea) => {
        return idea.authorName.toLowerCase() === user.toLowerCase()
      })
    }
    if (tags !== '') {
      const tagsArray = tags.split(',')
      ideas = ideas.filter((idea: IIdea) => {
        return idea.tags.some((tag: string) => {
          return tagsArray.includes(tag)
        })
      })
    }

    if (startDate) {
      ideas = ideas.filter((idea: IIdea) => {
        return idea.createdOn >= startDate
      })
    }
    if (endDate) {
      ideas = ideas.filter((idea: IIdea) => {
        return idea.createdOn <= endDate
      })
    }
    if (query !== '') {
      query = query.trim()
      results = fuzzysort.go(query, ideas, { keys: ['title', 'description', 'author.name'] }).map(result => {
        return { score: result.score, idea: result.obj }
      })
    }
    // time to paginate
    ideas = ideas.slice(offset, offset + limit)
    results = results?.slice(offset, offset + limit)

    return res.status(200).json({ ideas, results })
  } catch {
    return res.status(502).json({ error: 'Could not retrieve ideas from the database.' })
  }
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
      idea.comments = await Comment.find({ ideaId: idea._id }).populate('author', '_id name picture').lean()
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
