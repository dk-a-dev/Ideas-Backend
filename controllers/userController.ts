import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Comment from '../models/comment'
import Idea from '../models/idea'
import Tag from '../models/tags'
import { User } from '../models/user'

const getAllUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const users = await User.find().select({ givenName: 0, familyName: 0, googleId: 0, email: 0, __v: 0 }).lean()

    let tags: any = await Tag.find().select({ tag: 1, _id: 0 }).lean()
    tags = tags.map((tag: { tag: string }) => tag.tag)

    return res.status(200).json({ users, tags })
  } catch {
    return res.status(502).json({ error: 'Could not retrieve users and tags.' })
  }
}

const getUserComments = async (req: Request, res: Response): Promise<Response> => {
  const userId: string = res.locals.userId || ''

  try {
    const comments = await Comment.find({
      author: userId
    }).lean()

    const picture = await User.findById(userId).select('picture').lean()

    return res.status(200).json({ comments, picture: picture?.picture })
  } catch {
    return res.status(500).json({ error: 'Could not fetch comments by user.' })
  }
}

const getUserIdeas = async (req: Request, res: Response): Promise<Response> => {
  const userId: string = res.locals.userId || ''

  try {
    const ideas = await Idea.find({
      author: userId
    }).lean()

    const picture = await User.findById(userId).select('picture').lean()

    return res.status(200).json({ ideas, picture: picture?.picture })
  } catch {
    return res.status(500).json({ error: 'Could not fetch ideas by user.' })
  }
}

const getUnapprovedIdeas = async (req: Request, res: Response): Promise<Response> => {
  const userId: string = res.locals.userId || ''
  const authorizationId: string = res.locals.user.id || ''

  if (!new mongoose.Types.ObjectId(userId).equals(authorizationId)) {
    return res.status(404).json({ error: 'Bad Request. You can only get your own unapproved ideas.' })
  }

  try {
    const unapprovedIdeas = await Idea.find({
      author: userId,
      approved: false
    }).lean()

    return res.status(200).json({
      unapprovedIdeas
    })
  } catch {
    return res.status(500).json({ error: 'Could not fetch unapproved ideas.' })
  }
}

const getUserProfile = async (req: Request, res: Response): Promise<Response> => {
  const userId: string = res.locals.userId || ''

  try {
    const user = await User.findById(userId).select('_id name picture email ideaCount commentCount').lean()
    if (user === null) {
      return res.status(404).json({ error: 'User not found.' })
    }
    const ideas = await Idea.find({ author: userId })
    const object = {
      user,
      noOfIdeas: ideas.length
    }
    // This is being done, because of too many breaking changes in the previous codebase
    return res.status(200).json(object)
  } catch {
    return res.status(500).json({ error: 'Could not fetch user data.' })
  }
}

const getNotifications = async (req: Request, res: Response): Promise<Response> => {
  const authorizationId: string = res.locals.user.id || ''

  try {
    const notifications = await User.findById(authorizationId).select('notifications').lean()
    return res.status(200).json({ notifications })
  } catch {
    return res.status(500).json({ error: 'Could not fetch notifications.' })
  }
}

const readNotification = async (req: Request, res: Response): Promise<Response> => {
  const notificationId = res.locals?.notificationId || ''
  const userId: string = res.locals.user.id || ''

  const mongoNotifId = new mongoose.Types.ObjectId(notificationId)

  const newStatus = req.body?.newStatus || false

  try {
    await User.updateOne({ _id: userId, 'notifications._id': mongoNotifId }, {
      $set: { 'notifications.$.read': newStatus }
    })
    return res.status(200).json({ message: 'Successfully updated notification status.' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Internal server error. Could not change notification status.' })
  }
}

const clearNotification = async (req: Request, res: Response): Promise<Response> => {
  const userId: string = res.locals.user.id || ''
  const notificationId = res.locals?.notificationId || ''

  try {
    User.updateOne({ _id: userId }, { $pull: { notifications: { _id: notificationId } } })
    return res.status(200).json({ message: 'Successfully cleared notification.' })
  } catch (e) {
    return res.status(500).json({ error: 'Internal Server Error.' })
  }
}

const clearAllNotifications = async (req: Request, res: Response): Promise<Response> => {
  const userId: string = res.locals.user.id || ''

  try {
    await User.updateOne({ _id: userId }, { $set: { notifications: [] } })
    return res.status(200).json({ message: 'Successfully cleared all notifications' })
  } catch {
    return res.status(500).json({ error: 'Internal Server Error.' })
  }
}

export {
  getAllUsers,
  getUserComments,
  getUserIdeas,
  getUnapprovedIdeas,
  getUserProfile,
  getNotifications,
  readNotification,
  clearNotification,
  clearAllNotifications
}
