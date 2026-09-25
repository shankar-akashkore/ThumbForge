import { describe, it, expect, vi } from 'vitest';

vi.mock('mongoose', () => ({
    default: { connect: vi.fn(), connection: { on: vi.fn() } },
}));

import mongoose from 'mongoose';
import connectDB from '../configs/db.js';

describe('connectDB', () => {
    it('rethrows connection errors so the server stops instead of hanging', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error('bad auth : authentication failed'));

        await expect(connectDB()).rejects.toThrow('bad auth');
    });
});
