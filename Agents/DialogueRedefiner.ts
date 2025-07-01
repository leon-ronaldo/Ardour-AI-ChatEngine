import getAIResponse from "../utils/gemini";
import { IChatMessage } from "../models/ChatPool";
import { MemoryModel } from "../models/MemoryModel";

export default class DialogueRedefiner {

    /**
     * Polishes the raw AI reply so it feels human:
     *  - max ≈25 words
     *  - 0‑1 emoji
     *  - no “AI” talk, no repeated full names
     *  - trimmed exclamation / punctuation spam
     */
    async refineDialogue(
        rawReply: string,
        chatMessages: IChatMessage[],
        userName: string
    ): Promise<string> {
        // Last few messages for tone reference (optional, keeps prompt light)
        const recentContext = chatMessages
            .slice(-6)
            .map(m => (m.from === userName ? `${userName}: ${m.message}` : `AI: ${m.message}`))
            .join("\n");

        const prompt = `
            You are rewriting a chat reply so it sounds like a **real close friend**, not a chatbot.
            
            RULES:
            1. Keep the reply NATURAL in length:
               - If it's just small talk or a quick reaction, keep it **short (≈25 words)**.
               - If it's storytelling or meaningful emotional content, it's OK to be longer **only if it feels human and needed**.
            2. Use **at most one emoji** (optional, only if it helps express tone).
            3. NEVER mention being an AI or sound robotic.
            4. Don't repeat the user's name unless it's needed for emotional emphasis (no full name).
            5. Avoid overuse of exclamations, filler, or awkward enthusiasm.
            
            RAW DRAFT (needs refinement):
            "${rawReply}"
            
            RECENT CONTEXT:
            ${recentContext}
            
            Return ONLY the rewritten reply. No extra commentary or formatting.
            `;


        const response = await getAIResponse(prompt);
        return response ? response.trim() : rawReply.trim();
    }
}
