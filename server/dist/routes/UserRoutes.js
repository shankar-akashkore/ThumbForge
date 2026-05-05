import express from 'express';
import { getThumbnailbyId, getUserThumbnails } from '../controllers/UserController.js';
const UserRouter = express.Router();
UserRouter.get('/thumbnails', getUserThumbnails);
UserRouter.get('/thumbnail/:id', getThumbnailbyId);
export default UserRouter;
