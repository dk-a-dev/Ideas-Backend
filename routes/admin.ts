import express, { Router } from 'express'
import * as adminController from '../controllers/adminController'

import verifyPathParams from '../middlewares/verifyPathParams'

const router: Router = express.Router()

router.use(verifyPathParams(['ideaId']))

// add made real (post github links and deployed urls)
router.post('/makeReal/:ideaId', adminController.makeReal)

// edit github links and deployed urls
router.patch('/makeReal/:ideaId', adminController.editReal)

// approve or reject an idea
router.post('/approve/:ideaId', adminController.approveOrReject)

export default router
