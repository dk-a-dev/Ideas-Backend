import { Request, Response } from 'express'
import Idea from '../models/idea'
import { IIdea } from '../types/types'
import fuzzysort from 'fuzzysort'

interface editRealBody {
  gitLinks?: string[]
  deployedURLs?: string[]
  madeReal?: boolean
}

interface approveOrRejectBody {
  status: 'approved' | 'rejected'
}

const editReal = async (req: Request, res: Response): Promise<Response> => {
  const ideaID = req.params.ideaId || res.locals.ideaId || ''
  const stuff: editRealBody = req.body
  stuff?.deployedURLs?.forEach(url => {
    try {
      Boolean(new URL(url))
    } catch (_) {
      return res.status(400).json({ error: `Bad Request. ${url} is not a valid URL.` })
    }
  })

  stuff?.gitLinks?.forEach(url => {
    try {
      Boolean(new URL(url))
    } catch (_) {
      return res.status(400).json({ error: `Bad Request. ${url} is not a valid URL.` })
    }
  })

  try {
    const idea: IIdea | null = await Idea.findOne({ _id: ideaID })
    if (idea === null) {
      return res.status(500).json({ error: 'Idea Not Found' })
    }
    if (stuff?.gitLinks) {
      idea.gitLinks = stuff.gitLinks
    }
    if (stuff?.deployedURLs) {
      idea.deployedURLs = stuff.deployedURLs
    }
    if (stuff?.madeReal) {
      idea.madeReal = stuff.madeReal
    }
    await idea.save()
    return res.status(200).json({ idea })
  } catch (err) {
    return res.status(500).json({ error: 'Could not update idea.' })
  }
}

const approveOrReject = async (req: Request, res: Response): Promise<Response> => {
  const ideaID = req.params.ideaId || res.locals.ideaId || ''
  const stuff: approveOrRejectBody = req.body
  try {
    const idea: IIdea | null = await Idea.findOne({ _id: ideaID })
    if (idea === null) {
      return res.status(500).json({ error: 'Idea Not Found' })
    }
    if (stuff.status === 'approved') {
      idea.status = stuff.status
      await idea.save()
      return res.status(200).json({ idea })
    } else if (stuff.status === 'rejected') {
      idea.status = stuff.status
      await idea.save()
      return res.status(200).json({ idea })
    }
    return res.status(500).json({ error: 'Bad Request. Status must be approved or rejected.' })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Could not update idea.' })
  }
}

const resetIdea = async (req: Request, res: Response): Promise<Response> => {
  const ideaID = req.params.ideaId || res.locals.ideaId || ''
  console.log(ideaID)
  try {
    const idea: IIdea | null = await Idea.findOne({ _id: ideaID })
    if (idea == null) {
      return res.status(500).json({ error: 'Idea Not Found' })
    }
    idea.status = ''
    await idea.save()
    return res.status(200).json({ idea })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Could not update idea.' })
  }
}

const getAllIdeas = async (req: Request, res: Response): Promise<Response> => {
  let ideas
  // made real are not being sent , fix that
  const sortBy = req.query?.sortBy || 'date' // date, title, users given name, upvotes
  const order = req.query?.order || 'asc' // asc, desc
  const _user = req.query?.user || '' // filter by user
  const _tags = req.query?.tags || '' // comma separated tags (?tags=tag1,tag2,tag3)`
  const madeReal = req.query?.madeReal
  const status = req.query?.status || '' // can be approved, rejected, or empty string
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
    if (status === 'pending') {
      ideas = await Idea.find({ $or: [{ status: '' }, { status: 'pending' }] }).populate('author', 'name picture')
    } else if (status === 'approved') {
      ideas = await Idea.find({ status: 'approved' }).populate('author', 'name picture')
    } else if (status === 'rejected') {
      ideas = await Idea.find({ status: 'rejected' }).populate('author', 'name picture')
    } else {
      ideas = await Idea.find().populate('author', 'name picture')
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
    if (madeReal === 'true') {
      ideas = ideas.filter((idea: IIdea) => {
        return idea.madeReal
      })
    } else if (madeReal === 'false') {
      ideas = ideas.filter((idea: IIdea) => {
        return !idea.madeReal
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
    results = results?.slice(offset, offset + limit)
    // time to paginate
    ideas = ideas.slice(offset, offset + limit)

    return res.status(200).json({ ideas, results })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Could not get ideas.' })
  }
}

const getallApproved = async (req: Request, res: Response): Promise<Response> => {
  try {
    const ideas: IIdea[] = await Idea.find({ status: 'approved' })
    return res.status(200).json({ ideas })
  } catch (err) {
    return res.status(500).json({ error: 'Could not get ideas.' })
  }
}

const getallRejected = async (req: Request, res: Response): Promise<Response> => {
  try {
    const ideas: IIdea[] = await Idea.find({ status: 'rejected' })
    return res.status(200).json({ ideas })
  } catch (err) {
    return res.status(500).json({ error: 'Could not get ideas.' })
  }
}

export {
  editReal,
  resetIdea,
  approveOrReject,
  getAllIdeas,
  getallApproved,
  getallRejected
}
