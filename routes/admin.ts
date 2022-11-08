import express, { Router } from 'express'
import * as adminController from '../controllers/adminController'

import verifyPathParams from '../middlewares/verifyPathParams'
import verifyJWT, { verifyAdmin } from '../middlewares/jwt'

const router: Router = express.Router()

router.use(verifyPathParams(['ideaId']))

// add made real (post github links and deployed urls)
router.post('/makeReal/:ideaId', verifyJWT, verifyAdmin, adminController.makeReal)

// edit github links and deployed urls
router.patch('/makeReal/:ideaId', verifyJWT, verifyAdmin, adminController.editReal)

// approve or reject an idea
router.post('/approve/:ideaId', verifyJWT, verifyAdmin, adminController.approveOrReject)

export default router
