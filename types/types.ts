import { Document, Types } from 'mongoose'

interface INotification {
  createdOn: Number
  body: String
  source: Types.ObjectId
  parentIdeaId: Types.ObjectId | string | undefined
  parentIdeaTitle: string
  parentIdeaAuthorId: Types.ObjectId | string | undefined
  parentIdeaAuthorName: string
  commentAuthorId: Types.ObjectId | string | undefined
  commentAuthorName: string
  commentAuthorPicture: string | undefined
  sourceBody: String
  notificationType: Number
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
  admin: boolean
}

interface IIdea extends Document {
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
