import { Request, Response } from 'express'
import Idea from '../models/idea'
import { IIdea } from '../types/types'

interface makeRealRequestBody {
  gitLinks?: string[]
  deployedURLs?: string[]
}

interface editRealBody {
  gitLinks?: string[]
  deployedURLs?: string[]
  madeReal?: boolean
}

interface approveOrRejectBody {
  status: 'approved' | 'rejected'
}

const makeReal = async (req: Request, res: Response): Promise<Response> => {
  const ideaId = res.locals.ideaId || ''

  if (ideaId === '') {
    return res.status(400).json({ error: 'Bad request. Missing ideaId in request.' })
  }

  const stuff: makeRealRequestBody = req.body

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
    // finish this
    const theIdea: IIdea | null = await Idea.findOneAndUpdate({ _id: ideaId },
      {
        $set: {
          gitLinks: stuff?.gitLinks || [],
          deployedURLs: stuff?.deployedURLs || [],
          madeReal: true
        }
      },
      { new: true })
    if (theIdea === null) {
      return res.status(500).json({ error: 'Idea Not Found' })
    }
    return res.status(200).json({ idea: theIdea })
  } catch (err) {
    return res.status(500).json({ error: 'Could not update idea.' })
  }
}

const editReal = async (req: Request, res: Response): Promise<Response> => {
  const ideaID = res.locals.ideaId || ''
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
    if (idea.madeReal === false) {
      return res.status(400).json({ error: 'Idea is not marked as made real.' })
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
  const ideaID = res.locals.ideaId || ''
  const stuff: approveOrRejectBody = req.body
  try {
    const idea: IIdea | null = await Idea.findOne({ _id: ideaID })
    if (idea === null) {
      return res.status(500).json({ error: 'Idea Not Found' })
    }
    if (stuff.status === 'approved') {
      idea.approved = true
    } else {
      idea.rejected = true
    }
    await idea.save()
    return res.status(200).json({ idea })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Could not update idea.' })
  }
}

const getAllIdeas = async (req: Request, res: Response): Promise<Response> => {
  try {
    const ideas: IIdea[] = await Idea.find({})
    return res.status(200).json({ ideas })
  } catch (err) {
    return res.status(500).json({ error: 'Could not get ideas.' })
  }
}

export {
  makeReal,
  editReal,
  approveOrReject,
  getAllIdeas
}
