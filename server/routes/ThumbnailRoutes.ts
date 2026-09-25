import express from 'express';
import { deleteThumbnail, generateThumbnail } from '../controllers/ThumbnailController.js';
import protect from '../middlewares/auth.js';
import { rateLimit } from 'express-rate-limit';

const ThumbnailRouter = express.Router();

// Each generation uses the image API's daily quota, so cap it per logged-in user
const generateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => req.session.userId as string,
    message: { message: 'Generation limit reached. Please try again in an hour.' },
});

ThumbnailRouter.post('/generate',protect, generateLimiter, generateThumbnail)
ThumbnailRouter.delete('/delete/:id',protect, deleteThumbnail)

export default ThumbnailRouter;