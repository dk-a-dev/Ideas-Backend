import express, { Router } from 'express'
import * as adminController from '../controllers/adminController'

import verifyPathParams from '../middlewares/verifyPathParams'
import verifyJWT, { verifyAdmin } from '../middlewares/jwt'

const router: Router = express.Router()

// add made real (post github links and deployed urls)
router.post('/makeReal/:ideaId', verifyPathParams(['ideaId']), verifyJWT, verifyAdmin, adminController.makeReal)

// edit github links and deployed urls
router.patch('/makeReal/:ideaId', verifyPathParams(['ideaId']), verifyJWT, verifyAdmin, adminController.editReal)

router.get('/all', verifyJWT, verifyAdmin, adminController.getAllIdeas)

// approve or reject an idea
router.post('/approve/:ideaId', verifyPathParams(['ideaId']), verifyJWT, verifyAdmin, adminController.approveOrReject)

// reset idea
router.patch('/reset/:ideaId', verifyPathParams(['ideaId']), verifyJWT, verifyAdmin, adminController.resetIdea)

export default router
