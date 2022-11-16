import mongoose from 'mongoose'

import { IComment, IMention, INotification, IIdea } from '../types/types'
import { User } from '../models/user'
import Idea from '../models/idea'
import Comment from '../models/comment'

const addMention = async (doc: IComment & mongoose.Document, mentionType: string, ideaAuthor: any, commentAuthor: any) => {
  doc?.mentions?.length && doc?.mentions.forEach(async (mention: IMention) => {
    // console.log(doc)
    await addNotification(
      doc?.ideaId,
      doc?.ideaTitle,
      ideaAuthor?.author?._id,
      ideaAuthor?.author?.name,
      doc?.author,
      doc?.authorName,
      commentAuthor?.picture,
      doc?.body,
      mention?.userId,
      `${doc?.authorName} mentioned you in a ${mentionType}.`,
      doc?._id,
      1)
  })
}

const addCommentNotification = async (doc: IComment & mongoose.Document) => {
  const ideaAuthor: IIdea & { author: { name: string, _id: string } } = await Idea.findById(doc.ideaId).populate('author', 'picture name').select('author').lean()
  const commentAuthor = await User.findById(doc?.author).select('picture')

  await addMention(doc, 'comment', ideaAuthor, commentAuthor)
  console.log(ideaAuthor)
  await addNotification(
    doc?.ideaId,
    doc?.ideaTitle,
    ideaAuthor?.author?._id,
    ideaAuthor?.author?.name,
    doc?.author,
    doc?.authorName,
    commentAuthor?.picture,
    doc?.body,
    ideaAuthor?.author?._id,
    `${doc.authorName} added a comment to your idea`,
    doc._id,
    1
  )
}

const addReplyNotification = async (doc: IComment & mongoose.Document) => {
  const ideaAuthor: IIdea & { author: { name: string, _id: string } } = await Idea.findById(doc.ideaId).populate('author', 'picture name').select('author').lean()
  const commentAuthor = await User.findById(doc?.author).select('picture')

  await addMention(doc, 'reply', ideaAuthor, commentAuthor)
  await addNotification(
    doc?.ideaId,
    doc?.ideaTitle,
    ideaAuthor?.author?._id,
    ideaAuthor?.author?.name,
    doc.author,
    doc?.authorName,
    commentAuthor?.picture,
    doc?.body,
    ideaAuthor?._id,
    `${doc.authorName} replied to a comment in your idea.`,
    doc._id, 1
  )

  const parentCommentAuthor = await Comment.findById(doc?.parentCommentId).select('author').lean()
  await addNotification(
    doc?.ideaId,
    doc?.ideaTitle,
    ideaAuthor?.author?._id,
    ideaAuthor?.author?.name,
    doc.author,
    doc?.authorName,
    commentAuthor?.picture,
    doc?.body,
    parentCommentAuthor?._id,
    `${doc.authorName} replied to your comment.`,
    doc._id,
    1
  )
}

const addNotification = async (
  parentIdeaId: mongoose.Types.ObjectId | undefined | string,
  parentIdeaTitle: string,
  parentIdeaAuthorId: mongoose.Types.ObjectId | undefined | string,
  parentIdeaAuthorName: string,
  commentAuthorId: mongoose.Types.ObjectId | string | undefined,
  commentAuthorName: string,
  commentAuthorPicture: string | undefined,
  commentBody: string,
  userId: mongoose.Types.ObjectId | undefined,
  body: String,
  source: mongoose.Types.ObjectId,
  notificationType: Number = 1) => {
  const notification: INotification = {
    parentIdeaId,
    parentIdeaTitle,
    parentIdeaAuthorId,
    parentIdeaAuthorName,
    commentAuthorId,
    commentAuthorName,
    commentAuthorPicture,
    createdOn: Date.now(),
    body,
    source,
    sourceBody: commentBody,
    notificationType,
    read: false
  }

  try {
    await User.updateOne({ _id: userId }, { $push: { notifications: notification } })
  } catch (e) {
    console.error(e)
  }
}

export {
  addMention,
  addCommentNotification,
  addReplyNotification
}
