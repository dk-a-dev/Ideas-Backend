import express, { Router } from 'express'

import jwt from '../middlewares/jwt'

import * as ideaController from '../controllers/ideaController'
import * as commentController from '../controllers/commentController'
import verifyPathParams from '../middlewares/verifyPathParams'

const router: Router = express.Router()

// router.use(jwt)

router.get('/', ideaController.getAllIdeas)

router.post('/', jwt, ideaController.createIdea)

router.get('/:ideaId', verifyPathParams(['ideaId']), ideaController.getIdeaById)

router.put('/:ideaId', jwt, verifyPathParams(['ideaId']), ideaController.editIdea)

router.delete('/:ideaId', jwt, verifyPathParams(['ideaId']), ideaController.deleteIdea)

router.get('/user/:userId', verifyPathParams(['userId']), ideaController.getIdeaByUserId)

router.patch('/:ideaId/vote', jwt, verifyPathParams(['ideaId']), ideaController.voteIdea)

router.post('/:ideaId/comments', jwt, verifyPathParams(['ideaId']), commentController.addComment)

router.get('/comments/:commentId', jwt, verifyPathParams(['commentId']), commentController.getReplies)

router.delete('/comments/:commentId', jwt, verifyPathParams(['commentId']), commentController.deleteComment)

router.put('/comments/:commentId', jwt, verifyPathParams(['commentId']), commentController.editComment)

export default router
