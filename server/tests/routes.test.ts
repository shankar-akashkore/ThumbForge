import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// Real routers and rate limiters; controllers are stubbed, and the test picks the logged-in user with a header
const ok = vi.hoisted(() => (_req: any, res: any) => res.json({ ok: true }));
vi.mock('../controllers/AuthControllers.js', () => ({ registerUser: ok, loginUser: ok, verfiyUser: ok, logoutUser: ok }));
vi.mock('../controllers/ThumbnailController.js', () => ({ generateThumbnail: ok, deleteThumbnail: ok }));
vi.mock('../middlewares/auth.js', () => ({
    default: (req: any, _res: any, next: any) => { req.session = { userId: req.get('x-test-user') }; next(); },
}));

import express from 'express';
import AuthRoutes from '../routes/AuthRoutes.js';
import ThumbnailRouter from '../routes/ThumbnailRoutes.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', AuthRoutes);
    app.use('/api/thumbnail', ThumbnailRouter);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
    server.close();
});

const post = async (path: string, headers: Record<string, string> = {}) => {
    const response = await fetch(baseUrl + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' });
    return { status: response.status, body: await response.json() };
};

describe('rate limits', () => {
    it('blocks the 11th login or sign-up attempt from one IP within 15 minutes', async () => {
        for (let i = 0; i < 5; i++) expect((await post('/api/auth/login')).status).toBe(200);
        for (let i = 0; i < 5; i++) expect((await post('/api/auth/register')).status).toBe(200);

        const blocked = await post('/api/auth/login');

        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({ message: 'Too many attempts. Please try again in 15 minutes.' });
    });

    it('limits generation per user, not per IP', async () => {
        for (let i = 0; i < 10; i++) expect((await post('/api/thumbnail/generate', { 'x-test-user': 'user-a' })).status).toBe(200);

        const blocked = await post('/api/thumbnail/generate', { 'x-test-user': 'user-a' });
        const otherUser = await post('/api/thumbnail/generate', { 'x-test-user': 'user-b' });

        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({ message: 'Generation limit reached. Please try again in an hour.' });
        expect(otherUser.status).toBe(200);
    });
});
