import { Types } from 'mongoose'

interface INotification {
  createdOn: Date
  body: string
  source: string
  notificationType: number
  read: boolean
}

interface IUser {
  name: string
  givenName: string
  familyName: string
  googleId: string
  email: string
  picture: string
  notifications: INotification[]
  ideaCount: number
  commentCount: number
}

interface IIdea {
  _id: Types.ObjectId
  author: Types.ObjectId
  authorName: string
  title: string
  description: string
  upvotes: Types.ObjectId[] | string[]
  downvotes: Types.ObjectId[] | string[]
  tags: string[]
  gitLinks?: string[]
  deployedURLs?: string[]
  approved: Boolean
  rejected: Boolean
  madeReal?: Boolean
  createdOn: Date
}

interface IMention {
  userName: string
  userId: Types.ObjectId
}

interface IComment {
  ideaId: Types.ObjectId | string
  ideaTitle: string
  parentCommentId?: Types.ObjectId | string
  author: Types.ObjectId | string
  authorName: string
  body: string
  mentions?: IMention[]
}

interface ITag {
  tagId: Types.ObjectId | string
  tag: string
}

export {
  IMention,
  INotification,
  IUser,
  IIdea,
  IComment,
  ITag
}
