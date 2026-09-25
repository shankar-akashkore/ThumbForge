import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/User.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('bcrypt', () => ({ default: { compare: vi.fn() } }));

import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { registerUser, loginUser, logoutUser } from '../controllers/AuthControllers.js';

const findOne = vi.mocked(User.findOne);
const compare = vi.mocked(bcrypt.compare);

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    return res;
};

beforeEach(() => {
    vi.resetAllMocks();
});

describe('registerUser', () => {
    it.each([
        ['missing name and password', { email: 'a@b.c' }],
        ['blank name', { name: '   ', email: 'a@b.c', password: 'secret' }],
        ['object instead of an email', { name: 'A', email: { $ne: '' }, password: 'secret' }],
    ])('rejects %s without touching the database', async (_label, body) => {
        const res = mockRes();

        await registerUser({ body, session: {} } as any, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Name, email and password are required' });
        expect(findOne).not.toHaveBeenCalled();
    });
});

describe('loginUser', () => {
    it('rejects a query object as the email (NoSQL operator injection)', async () => {
        const res = mockRes();

        await loginUser({ body: { email: { $ne: '' }, password: 'x' }, session: {} } as any, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(findOne).not.toHaveBeenCalled();
    });

    it('returns the same error for an unknown email', async () => {
        findOne.mockResolvedValueOnce(null);
        const res = mockRes();

        await loginUser({ body: { email: 'nobody@b.c', password: 'x' }, session: {} } as any, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });

    it('returns the same error for a wrong password as for an unknown email', async () => {
        findOne.mockResolvedValueOnce({ _id: 'u1', password: 'hashed' } as any);
        compare.mockResolvedValueOnce(false as never);
        const session: any = {};
        const res = mockRes();

        await loginUser({ body: { email: 'a@b.c', password: 'wrong' }, session } as any, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
        expect(session.isLoggedIn).toBeUndefined();
    });
});

describe('logoutUser', () => {
    it('responds once, after the session is destroyed', async () => {
        const res = mockRes();
        const session = { destroy: vi.fn((callback: (error?: Error) => void) => callback()) };

        await logoutUser({ session } as any, res);

        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });

    it('returns 500 (and no success message) when the session cannot be destroyed', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const res = mockRes();
        const session = { destroy: vi.fn((callback: (error?: Error) => void) => callback(new Error('store offline'))) };

        await logoutUser({ session } as any, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({ message: 'store offline' });
    });
});
