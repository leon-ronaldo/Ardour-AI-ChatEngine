import { GoogleGenAI } from '@google/genai';
import { debugLog } from './tools';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: "AIzaSyBMlGsH4vA9gcEimwnOyMTAFcPZ33J3akI" });

export default async function getAIResponse(prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
        // model: 'gemini-2.5-flash',
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.8
        }
    });

    let text = response.text!.trim();

    // Remove Markdown code block formatting if present (e.g., ```json ... ```)
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonBlockMatch) {
        text = jsonBlockMatch[1].trim();
    }

    return text;
}


// getAIResponse("hey!")