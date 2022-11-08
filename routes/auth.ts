import express, { Request, Response, Router } from 'express'
import { LoginTicket } from 'google-auth-library'
import jwt from 'jsonwebtoken'

import verifyGoogleUser from '../middlewares/ticket'

import { User } from '../models/user'

const JWT_SECRET: string = process.env.JWT_SECRET || 'shhh'

const router: Router = express.Router()

router.post('/google', verifyGoogleUser, async (req: Request, res: Response) => {
  try {
    const ticket: LoginTicket = res.locals.ticket

    const ticketPayload = ticket.getPayload()

    const userID = ticket.getUserId() || ''

    const currentUser = await User.findOne({
      googleId: userID
    })

    if (currentUser === null) {
      const newUser = await new User({
        googleId: userID,
        name: ticketPayload?.name,
        givenName: ticketPayload?.given_name,
        familyName: ticketPayload?.family_name,
        email: ticketPayload?.email,
        picture: ticketPayload?.picture
      })

      await newUser.save((saveErr: any, savedUser: any) => {
        if (saveErr) {
          res.status(502).json({ error: 'Could not create user' })
        } else {
          const newToken: string = jwt.sign({
            id: JSON.stringify(savedUser._id).slice(1, -1),
            name: savedUser.name,
            admin: savedUser.admin
          }, JWT_SECRET, {
            expiresIn: '30d'
          })
          return res.status(201).json({
            data: savedUser,
            token: newToken
          })
        }
      })
    } else {
      const newToken: string = jwt.sign({
        id: JSON.stringify(currentUser._id).slice(1, -1),
        name: currentUser.name,
        admin: currentUser.admin
      }, JWT_SECRET, {
        expiresIn: '30d'
      })
      return res.status(200).json({ data: currentUser, token: newToken })
    }
  } catch {
    return res.status(401).json({ error: 'Unauthorized.' })
  }
})

export default router
