import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import connectDB from "./configs/db.js";
import session from "express-session";
import MongoStore from "connect-mongo";

declare module 'express-session' {
    interface SessionData {
        isLoggedIn: boolean;
        userId: string;
    }
}

await connectDB();
const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}))

app.use(session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7
    },
    store:MongoStore.create({
        mongoUrl: process.env.MONGODB_URI as string,
        collectionName: 'sessions'
    })
}))

app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});