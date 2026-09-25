import { Request, Response } from 'express';
import Thumbnail from '../models/Thumbnail.js';
import { generateImage } from '../configs/ai.js';
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

const aspectRatios = ['16:9', '1:1', '9:16'];


export const generateThumbnail = async (req: Request, res: Response) => {
    let thumbnailId: string | undefined;

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
        thumbnailId = thumbnail._id;

        let prompt = `Create a ${stylePrompts[style as keyof typeof stylePrompts]} YouTube thumbnail for: "${title}". `;

        if(color_scheme) {
            prompt += `Use a ${colorSchemaDescriptions[color_scheme as keyof typeof colorSchemaDescriptions]} color scheme. `;
        }

        if(user_prompt) {
            prompt += `Additional details: ${user_prompt}. `;
        }

        prompt += `The thumbnail should be ${aspect_ratio}, visually stunning, and designed to maximize click-through rate. Make it bold, professional, and impossible to ignore!`

        const ratio = aspectRatios.includes(aspect_ratio) ? aspect_ratio : '16:9';
        const image = await generateImage(prompt, ratio);

        // Upload the base64 image directly: serverless filesystems are read-only outside /tmp
        const upload = (background?: string) => cloudinary.uploader.upload(`data:${image.mimeType || 'image/png'};base64,${image.data}`, {
            resource_type: 'image',
            folder: 'thumbnails',
            transformation: background ? [{ aspect_ratio: ratio, crop: 'pad', background }] : undefined,
        });

        // Square fallback images are extended to the chosen ratio with Cloudinary's generative fill
        // (cropping would cut off the title text); plain padding is the backup if generative fill fails
        const uploadResult = image.square && ratio !== '1:1'
            ? await upload('gen_fill').catch((error) => { console.log(error); return upload('auto'); })
            : await upload();

        thumbnail.image_url = uploadResult.secure_url;
        thumbnail.prompt_used = prompt;
        thumbnail.isGenerating = false;
        await thumbnail.save();

        res.json({ message: 'Thumbnail Generated', thumbnail})

    } catch (error: any) {
        console.log(error);
        // Don't leave a record stuck in "Generating..." when generation fails
        if(thumbnailId) {
            await Thumbnail.deleteOne({ _id: thumbnailId }).catch(console.log);
        }
        // Quota errors arrive as long JSON strings; show something readable instead
        const message = [402, 429].includes(error?.status)
            ? 'Image generation limit reached: the free quota or prepaid credits are used up, or billing is not enabled.'
            : error.message;
        res.status(500).json({ message });
    }
}

export const deleteThumbnail = async (req: Request, res: Response) => {
    try {

        const {id} = req.params;
        const {userId} = req.session;

        const deleted = await Thumbnail.findOneAndDelete({_id: id, userId});

        if(!deleted) {
            return res.status(404).json({ message: 'Thumbnail not found' });
        }

        res.json({ message: 'Thumbnail delete successfully'});

    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}
