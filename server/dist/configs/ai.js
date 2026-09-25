import { GoogleGenAI } from "@google/genai";
// Cloudflare Workers AI has a free daily allowance (roughly 100 thumbnails a day).
// Gemini image models need billing enabled. When both Cloudflare values are set, Cloudflare is used.
const CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
// Square-only but fast; used when FLUX.2's safety filter flags an image (common with brand names like "MacBook")
const CLOUDFLARE_FALLBACK_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const CLOUDFLARE_FLAGGED_OUTPUT = 3030;
const MAX_SEED = 4294967295;
const FALLBACK_MAX_PROMPT_LENGTH = 2048;
const GEMINI_MODEL = 'gemini-3.1-flash-image';
const cloudflareSizes = {
    '16:9': [1024, 576],
    '1:1': [1024, 1024],
    '9:16': [576, 1024],
};
const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});
const detectMimeType = (base64) => base64.startsWith('/9j/') ? 'image/jpeg' : base64.startsWith('UklGR') ? 'image/webp' : 'image/png';
const runCloudflareModel = async (model, body) => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        },
        body,
    });
    const json = await response.json().catch(() => null);
    const image = json?.result?.image;
    if (!response.ok || !image) {
        const error = new Error(`Image generation failed: ${json?.errors?.[0]?.message || `HTTP ${response.status}`}`);
        error.status = response.status;
        error.code = json?.errors?.[0]?.code;
        throw error;
    }
    return image;
};
const generateWithCloudflare = async (prompt, aspectRatio) => {
    const [width, height] = cloudflareSizes[aspectRatio] || cloudflareSizes['16:9'];
    // FLUX.2 models on Workers AI take multipart form data, not JSON
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', String(width));
    form.append('height', String(height));
    // The default seed is fixed, so without this the same title always returns the same image
    form.append('seed', String(Math.floor(Math.random() * MAX_SEED)));
    try {
        const image = await runCloudflareModel(CLOUDFLARE_MODEL, form);
        return { data: image, mimeType: detectMimeType(image) };
    }
    catch (error) {
        if (error.code !== CLOUDFLARE_FLAGGED_OUTPUT)
            throw error;
        const image = await runCloudflareModel(CLOUDFLARE_FALLBACK_MODEL, JSON.stringify({ prompt: prompt.slice(0, FALLBACK_MAX_PROMPT_LENGTH), steps: 8 }));
        return { data: image, mimeType: detectMimeType(image), square: true };
    }
};
const generateWithGemini = async (prompt, aspectRatio) => {
    const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio, imageSize: '1K' },
        },
    });
    const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
    if (!image?.data) {
        throw new Error('No image generated');
    }
    return { data: image.data, mimeType: image.mimeType || 'image/png' };
};
export const generateImage = (prompt, aspectRatio) => process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN
    ? generateWithCloudflare(prompt, aspectRatio)
    : generateWithGemini(prompt, aspectRatio);
