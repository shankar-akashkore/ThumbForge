import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Thumbnail.js', () => ({
    default: { create: vi.fn(), deleteOne: vi.fn(), findOneAndDelete: vi.fn() },
}));
vi.mock('../configs/ai.js', () => ({ generateImage: vi.fn() }));
vi.mock('cloudinary', () => ({ v2: { uploader: { upload: vi.fn() } } }));

import Thumbnail from '../models/Thumbnail.js';
import { generateImage } from '../configs/ai.js';
import { v2 as cloudinary } from 'cloudinary';
import { generateThumbnail, deleteThumbnail } from '../controllers/ThumbnailController.js';

const mocked = {
    create: vi.mocked(Thumbnail.create),
    deleteOne: vi.mocked(Thumbnail.deleteOne),
    findOneAndDelete: vi.mocked(Thumbnail.findOneAndDelete),
    generateImage: vi.mocked(generateImage),
    upload: vi.mocked(cloudinary.uploader.upload),
};

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    return res;
};

const generateReq = (body: Record<string, unknown> = {}) => ({
    session: { userId: 'user-1' },
    body: { title: 'Buy Macbook', prompt: '', style: 'Bold & Graphic', aspect_ratio: '16:9', color_scheme: 'sunset', ...body },
}) as any;

let placeholder: any;

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    placeholder = { _id: 'thumb-1', save: vi.fn().mockResolvedValue(undefined) };
    mocked.create.mockResolvedValue(placeholder);
    mocked.deleteOne.mockResolvedValue({} as any);
    mocked.upload.mockResolvedValue({ secure_url: 'https://res.cloudinary.com/demo/image/upload/thumbnails/a.jpg' } as any);
});

describe('deleteThumbnail', () => {
    it('only deletes a thumbnail owned by the logged-in user', async () => {
        mocked.findOneAndDelete.mockResolvedValue({ _id: 't1' } as any);
        const res = mockRes();

        await deleteThumbnail({ params: { id: 't1' }, session: { userId: 'user-1' } } as any, res);

        expect(mocked.findOneAndDelete).toHaveBeenCalledWith({ _id: 't1', userId: 'user-1' });
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: 'Thumbnail delete successfully' });
    });

    it('returns 500 when the database fails', async () => {
        mocked.findOneAndDelete.mockRejectedValue(new Error('connection lost'));
        const res = mockRes();

        await deleteThumbnail({ params: { id: 't1' }, session: { userId: 'user-1' } } as any, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'connection lost' });
    });

    it("returns 404 for someone else's (or a missing) thumbnail", async () => {
        mocked.findOneAndDelete.mockResolvedValue(null);
        const res = mockRes();

        await deleteThumbnail({ params: { id: 't1' }, session: { userId: 'attacker' } } as any, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Thumbnail not found' });
    });
});

describe('generateThumbnail', () => {
    it('saves the uploaded image URL and finishes the placeholder', async () => {
        mocked.generateImage.mockResolvedValue({ data: '/9j/abc', mimeType: 'image/jpeg' });
        const res = mockRes();

        await generateThumbnail(generateReq(), res);

        expect(mocked.upload).toHaveBeenCalledTimes(1);
        expect(mocked.upload).toHaveBeenCalledWith('data:image/jpeg;base64,/9j/abc', expect.objectContaining({ folder: 'thumbnails', transformation: undefined }));
        expect(placeholder.image_url).toBe('https://res.cloudinary.com/demo/image/upload/thumbnails/a.jpg');
        expect(placeholder.isGenerating).toBe(false);
        expect(placeholder.save).toHaveBeenCalled();
        expect(mocked.deleteOne).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Thumbnail Generated' }));
    });

    it('deletes the placeholder and returns 500 when generation fails', async () => {
        mocked.generateImage.mockRejectedValue(new Error('Image generation failed: Authentication error'));
        const res = mockRes();

        await generateThumbnail(generateReq(), res);

        expect(mocked.deleteOne).toHaveBeenCalledWith({ _id: 'thumb-1' });
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Image generation failed: Authentication error' });
    });

    it('returns 500 without a cleanup attempt when the placeholder cannot be created', async () => {
        mocked.create.mockRejectedValue(new Error('validation failed'));
        const res = mockRes();

        await generateThumbnail(generateReq(), res);

        expect(mocked.generateImage).not.toHaveBeenCalled();
        expect(mocked.deleteOne).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'validation failed' });
    });

    it.each([402, 429])('shows a readable message instead of raw JSON for quota errors (HTTP %i)', async (status) => {
        mocked.generateImage.mockRejectedValue(Object.assign(new Error('{"error":{"code":429,"message":"..."}}'), { status }));
        const res = mockRes();

        await generateThumbnail(generateReq(), res);

        expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('Image generation limit reached') });
    });

    it('extends square fallback images to 16:9 with generative fill', async () => {
        mocked.generateImage.mockResolvedValue({ data: '/9j/abc', mimeType: 'image/jpeg', square: true });
        const res = mockRes();

        await generateThumbnail(generateReq(), res);

        expect(mocked.upload).toHaveBeenCalledTimes(1);
        expect(mocked.upload.mock.calls[0][1]).toMatchObject({ transformation: [{ aspect_ratio: '16:9', crop: 'pad', background: 'gen_fill' }] });
    });

    it('falls back to plain padding when generative fill fails', async () => {
        mocked.generateImage.mockResolvedValue({ data: '/9j/abc', mimeType: 'image/jpeg', square: true });
        mocked.upload
            .mockRejectedValueOnce(new Error('generative fill unavailable'))
            .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/demo/image/upload/thumbnails/padded.jpg' } as any);
        const res = mockRes();

        await generateThumbnail(generateReq(), res);

        expect(mocked.upload).toHaveBeenCalledTimes(2);
        expect(mocked.upload.mock.calls[1][1]).toMatchObject({ transformation: [{ aspect_ratio: '16:9', crop: 'pad', background: 'auto' }] });
        expect(placeholder.image_url).toBe('https://res.cloudinary.com/demo/image/upload/thumbnails/padded.jpg');
        expect(res.status).not.toHaveBeenCalled();
    });

    it('does not pad square images when 1:1 was requested', async () => {
        mocked.generateImage.mockResolvedValue({ data: '/9j/abc', mimeType: 'image/jpeg', square: true });
        const res = mockRes();

        await generateThumbnail(generateReq({ aspect_ratio: '1:1' }), res);

        expect(mocked.upload.mock.calls[0][1]).toMatchObject({ transformation: undefined });
    });

    it('falls back to 16:9 for an unknown aspect ratio', async () => {
        mocked.generateImage.mockResolvedValue({ data: '/9j/abc', mimeType: 'image/jpeg' });
        const res = mockRes();

        await generateThumbnail(generateReq({ aspect_ratio: '4:3' }), res);

        expect(mocked.generateImage).toHaveBeenCalledWith(expect.any(String), '16:9');
    });
});
