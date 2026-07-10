import OpenAI from "openai";

const ai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string,
})

export default ai;
