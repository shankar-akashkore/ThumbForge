import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const generateContent = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({
    GoogleGenAI: class { models = { generateContent }; },
}));

import { generateImage } from '../configs/ai.js';

const cloudflareResponse = (status: number, body: unknown) =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const fetchMock = vi.fn();

beforeEach(() => {
    fetchMock.mockReset();
    generateContent.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('generateImage with Cloudflare', () => {
    beforeEach(() => {
        vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'account-1');
        vi.stubEnv('CLOUDFLARE_API_TOKEN', 'token-1');
    });

    it('asks FLUX.2 for the requested size with a random seed', async () => {
        fetchMock.mockResolvedValueOnce(cloudflareResponse(200, { result: { image: '/9j/abc' } }));

        const image = await generateImage('a prompt', '16:9');

        expect(image).toEqual({ data: '/9j/abc', mimeType: 'image/jpeg' });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/account-1/ai/run/@cf/black-forest-labs/flux-2-klein-4b');
        const form = init.body as FormData;
        expect(form.get('width')).toBe('1024');
        expect(form.get('height')).toBe('576');
        expect(Number(form.get('seed'))).toBeGreaterThanOrEqual(0);
        expect(generateContent).not.toHaveBeenCalled();
    });

    it('falls back to square FLUX.1 Schnell when FLUX.2 flags the image (code 3030)', async () => {
        fetchMock
            .mockResolvedValueOnce(cloudflareResponse(400, { errors: [{ code: 3030, message: 'AiError: Your output has been flagged.' }] }))
            .mockResolvedValueOnce(cloudflareResponse(200, { result: { image: '/9j/square' } }));

        const image = await generateImage('Buy Macbook', '16:9');

        expect(image).toEqual({ data: '/9j/square', mimeType: 'image/jpeg', square: true });
        const [url, init] = fetchMock.mock.calls[1];
        expect(url).toContain('@cf/black-forest-labs/flux-1-schnell');
        expect(JSON.parse(init.body)).toEqual({ prompt: 'Buy Macbook', steps: 8 });
    });

    it.each([
        ['1:1', '1024', '1024'],
        ['9:16', '576', '1024'],
        ['4:3', '1024', '576'],
    ])('uses the right size for %s', async (ratio, width, height) => {
        fetchMock.mockResolvedValueOnce(cloudflareResponse(200, { result: { image: 'iVBORabc' } }));

        const image = await generateImage('a prompt', ratio);

        expect(image.mimeType).toBe('image/png');
        const form = fetchMock.mock.calls[0][1].body as FormData;
        expect([form.get('width'), form.get('height')]).toEqual([width, height]);
    });

    it('reports the fallback error when FLUX.1 Schnell also fails', async () => {
        fetchMock
            .mockResolvedValueOnce(cloudflareResponse(400, { errors: [{ code: 3030, message: 'flagged' }] }))
            .mockResolvedValueOnce(cloudflareResponse(429, { errors: [{ code: 4006, message: 'daily free allocation used up' }] }));

        await expect(generateImage('a prompt', '16:9')).rejects.toMatchObject({
            message: 'Image generation failed: daily free allocation used up',
            status: 429,
        });
    });

    it('reports the HTTP status when Cloudflare returns a non-JSON error', async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } } as unknown as Response);

        await expect(generateImage('a prompt', '16:9')).rejects.toThrow('Image generation failed: HTTP 502');
    });

    it('does not fall back on other Cloudflare errors', async () => {
        fetchMock.mockResolvedValueOnce(cloudflareResponse(401, { errors: [{ code: 10000, message: 'Authentication error' }] }));

        await expect(generateImage('a prompt', '16:9')).rejects.toMatchObject({
            message: 'Image generation failed: Authentication error',
            status: 401,
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe('generateImage with Gemini', () => {
    beforeEach(() => {
        vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', '');
        vi.stubEnv('CLOUDFLARE_API_TOKEN', '');
    });

    it('uses Gemini when the Cloudflare settings are missing', async () => {
        generateContent.mockResolvedValueOnce({
            candidates: [{ content: { parts: [{ inlineData: { data: 'iVBORabc', mimeType: 'image/png' } }] } }],
        });

        const image = await generateImage('a prompt', '9:16');

        expect(image).toEqual({ data: 'iVBORabc', mimeType: 'image/png' });
        expect(generateContent.mock.calls[0][0].config.imageConfig).toEqual({ aspectRatio: '9:16', imageSize: '1K' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws when Gemini returns no image', async () => {
        generateContent.mockResolvedValueOnce({ candidates: [{ content: { parts: [{ text: 'I cannot draw that' }] } }] });

        await expect(generateImage('a prompt', '16:9')).rejects.toThrow('No image generated');
    });
});
