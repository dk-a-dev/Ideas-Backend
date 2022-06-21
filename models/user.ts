import mongoose from 'mongoose'

const Schema = mongoose.Schema

interface IUser {
  name: String,
  givenName: String,
  familyName: String,
  googleId: String,
  email: String,
  picture: String
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true
  },
  givenName: {
    type: String,
    required: true
  },
  familyName: {
    type: String,
    required: true
  },
  googleId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  picture: {
    type: String,
    required: true
  }
})

const User = mongoose.model('user', userSchema)

export default User
