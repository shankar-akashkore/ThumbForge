import { Request, Response } from 'express';
import Thumbnail from '../models/Thumbnail.js';
import path from 'path';
import ai from '../configs/ai.js';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';


const stylePrompts = {
    'Bold & Graphic': 'eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional style',

    'Tech/Futuristic': 'futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere',

    'Minimalist': 'minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clear focal point',

    'Photorealistic': 'photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field',

    'Illustrated': 'illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style',
}

const colorSchemaDescriptions = {
    vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',

    sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',

    forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',

    neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',

    purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',

    monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',

    ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',

    pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
}

const aspectRatioToSize: Record<string, '1792x1024' | '1024x1024' | '1024x1792'> = {
    '16:9': '1792x1024',
    '1:1':  '1024x1024',
    '9:16': '1024x1792',
}


export const generateThumbnail = async (req: Request, res: Response) => {
    try {

        const {userId} = req.session;
        const {
            title,
            prompt: user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay
        } = req.body;

        const thumbnail = await Thumbnail.create({
            userId,
            title,
            prompt_used: user_prompt,
            user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay,
            isGenerating: true
        })

        let prompt = `Create a ${stylePrompts[style as keyof typeof stylePrompts]} YouTube thumbnail for: "${title}". `;

        if(color_scheme) {
            prompt += `Use a ${colorSchemaDescriptions[color_scheme as keyof typeof colorSchemaDescriptions]} color scheme. `;
        }

        if(user_prompt) {
            prompt += `Additional details: ${user_prompt}. `;
        }

        prompt += `The thumbnail should be ${aspect_ratio}, visually stunning, and designed to maximize click-through rate. Make it bold, professional, and impossible to ignore!`

        const size = aspectRatioToSize[aspect_ratio] || '1792x1024';

        const response = await ai.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size,
            response_format: 'b64_json',
            quality: 'hd',
        });

        const b64 = response.data?.[0]?.b64_json;

        if (!b64) {
            throw new Error('No image generated');
        }

        const finalBuffer = Buffer.from(b64, 'base64');

        const filename = `final-output-${Date.now()}.png`;
        const filePath = path.join('images', filename);

        fs.mkdirSync('images', { recursive: true });
        fs.writeFileSync(filePath, finalBuffer);

        const uploadResult = await cloudinary.uploader.upload(filePath, {resource_type: 'image', folder: 'thumbnails'});

        thumbnail.image_url = uploadResult.url;
        thumbnail.prompt_used = prompt;
        thumbnail.isGenerating = false;
        await thumbnail.save();

        res.json({ message: 'Thumbnail Generated', thumbnail})

        fs.unlinkSync(filePath);

    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const deleteThumbnail = async (req: Request, res: Response) => {
    try {

        const {id} = req.params;
        const {userId} = req.session;

        await Thumbnail.findByIdAndDelete({_id: id, userId});

        res.json({ message: 'Thumbnail delete successfully'});

    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}
