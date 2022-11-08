import express, { Request, Response, Router } from 'express'

import auth from './auth'
import ideas from './ideas'
import user from './user'
import admin from './admin'
import verifyJWT from '../middlewares/jwt'
import { clearAllNotifications, clearNotification, getNotifications, readNotification } from '../controllers/userController'
import verifyPathParams from '../middlewares/verifyPathParams'

const router: Router = express.Router()

router.get('/', (req: Request, res: Response) => {
  res.status(200)
    .json({
      status: 'Server is up'
    })
})

router.use('/auth', auth)
router.use('/ideas', ideas)
router.use('/user', user)
router.use('/admin', admin)
router.get('/notifications', verifyJWT, getNotifications)
router.post('/notifications/:notificationId', verifyJWT, verifyPathParams(['notificationId']), readNotification)
router.delete('/notifications/:notificationId', verifyJWT, verifyPathParams(['notificationId']), clearNotification)
router.delete('/notifications/', clearAllNotifications)

export default router
