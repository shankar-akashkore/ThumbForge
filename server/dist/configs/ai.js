import { GoogleGenAI } from "@google/genai";
const getApiKeys = () => {
    const keys = [
        process.env.GEMINI_API_KEY,
        ...(process.env.GEMINI_API_KEYS?.split(",") || []),
    ]
        .map((key) => key?.trim())
        .filter((key) => Boolean(key));
    return [...new Set(keys)];
};
export const getGoogleAiClients = () => {
    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
        throw new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS");
    }
    return apiKeys.map((apiKey) => new GoogleGenAI({ apiKey }));
};
