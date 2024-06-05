import dotenv from 'dotenv'

import { Request, Response, NextFunction } from 'express'
import { LoginTicket, OAuth2Client } from 'google-auth-library'

dotenv.config()

const CLIENT_ID: string = process.env.G_CLIENT_ID || ''

const client: OAuth2Client = new OAuth2Client(CLIENT_ID)

const verify = async (req: Request, res: Response, next: NextFunction) => {
  const userToken: string = req.body.token

  res.locals.userToken = userToken

  if (!userToken) {
    return res.status(400).json({ error: 'Bad request. Perhaps you forgot to send the user Token.' })
  } else {
    client.verifyIdToken({
      idToken: userToken,
      audience: CLIENT_ID
    }, (err: Error | null, login?: LoginTicket | undefined) => {
      if (err) {
        console.error(err)
        return res.status(401).json({ error: 'Bad token.' })
      } else {
        res.locals.ticket = login
        next()
      }
    })
  }
}

export default verify
