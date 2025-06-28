import { IChatMessage } from "../models/ChatPool";
import { MemoryModel } from "../models/MemoryModel";
import getAIResponse from "../utils/gemini";
import { formatChatLog } from "../utils/tools";

export type ChatCategory =
    | "StateReflection"          // Talks about current state or feeling
    // e.g., "I'm so tired today" or "Feeling kinda lazy"

    | "SelfDisclosure"           // Personal sharing, inner thoughts
    // e.g., "I don't trust people easily" or "I get anxious in crowds"

    | "CasualChitchat"           // Small talk, warm-up, friendly noise
    // e.g., "What you up to?" or "Had lunch yet?"

    | "SocialBonding"            // Caring, supportive, affectionate messages
    // e.g., "Love ya bro!" or "Text me when you get home safe"

    | "Informational"            // Sharing facts, updates, status
    // e.g., "Class is postponed tomorrow" or "I just bought a new phone"

    | "Storytelling"             // Describing past events or memories
    // e.g., "Last weekend we got stuck in an elevator" or "When I was in school..."

    | "GoalOriented"             // Plans, tasks, decision making
    // e.g., "Let's meet at 5 PM" or "I need to finish this assignment today"

    | "ExpressiveEmotional"      // Emotional venting or reaction
    // e.g., "Ugh I'm sooo annoyed rn" or "OMG I’m crying laughing 😂"

    | "ReflectivePhilosophical"  // Deep thoughts, life reflection
    // e.g., "Do you ever wonder what our purpose is?" or "Sometimes I feel like time isn't even real"

    | "Filler";                  // Low-content, passive or nonverbal messages
// e.g., "hmm", "ok", "lol", "...", "maybe"


export interface ClassifiedChatMessage {
    category: ChatCategory;
    confidence: number;
    requiresContext: boolean;
}

export type ContextWeight = "LIGHT" | "MEDIUM" | "HEAVY";

export interface ContextState {
    activity: string;            // e.g., "eating", "coding", "watching movie"
    contextWeight: ContextWeight; // Duration/importance of the context
    timestamp: number;           // When the activity started (Date.now())
}


export default class DialogueGenerator {
    chats: IChatMessage[];
    counter: number = 0;
    epoch: number = 20;
    currentContext?: ContextState;
    previousContexts?: ContextState[];
    memoryFragment: MemoryModel;

    constructor(chats: IChatMessage[], memoryFragment: MemoryModel) {
        this.chats = chats;
        this.memoryFragment = memoryFragment;
        this.generateCurrentContext()
    }

    async generateCurrentContext() {
        this.currentContext = await this.generateContext("adult woman", new Date())
    }

    // Define dynamic range per weight (in minutes)
    contextDurations: Record<ContextWeight, [min: number, max: number]> = {
        LIGHT: [3, 10],     // 3–10 minutes
        MEDIUM: [10, 25],   // 10–25 minutes
        HEAVY: [25, 45],    // 25–45 minutes
    };

    // Convert minutes to milliseconds
    getRandomDurationMs(weight: ContextWeight): number {
        const [min, max] = this.contextDurations[weight];
        const durationMin = min * 60 * 1000;
        const durationMax = max * 60 * 1000;
        return Math.floor(Math.random() * (durationMax - durationMin + 1)) + durationMin;
    }

    isContextExpired(latest: ContextState, now: number): boolean {
        const allowedDuration = this.getRandomDurationMs(latest.contextWeight);
        return now - latest.timestamp > allowedDuration;
    }

    async generateContext(
        professionOrTrait: string,
        currentDate: Date,
        previousContexts: ContextState[] = []
    ): Promise<ContextState> {
        const now = currentDate.getTime();
        const latest = previousContexts[previousContexts.length - 1];

        // If there's a recent context and it hasn't expired yet, reuse it
        if (latest && !this.isContextExpired(latest, now)) {
            return latest;
        }

        // Use AI to generate new context
        const hour = currentDate.getHours();
        const minute = currentDate.getMinutes();

        const prompt = `
  You are a smart AI assistant trained to predict what a person is most likely doing **right now** based on their profession/trait and the time of day.
  
  The person is a "${professionOrTrait}" and the current time is ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}.
 
  Notes:
  - "activity" should be casual and human-like, not too robotic
  - "contextWeight" must be one of: "LIGHT", "MEDIUM", "HEAVY"
  - Output JSON only. No explanation text.

  Return a JSON object describing the current context like this format:

  {
    "activity": "scrolling through Instagram reels",
    "contextWeight": "LIGHT",
    "timestamp": ${now}
  }
  `;

        const response = await getAIResponse(prompt);
        if (!response) {
            // fallback if AI fails
            return {
                activity: "unknown",
                contextWeight: "LIGHT",
                timestamp: now,
            };
        }

        try {
            const context = JSON.parse(response.trim());
            return {
                activity: context.activity,
                contextWeight: context.contextWeight,
                timestamp: now,
            };
        } catch (e) {
            console.log(response.trim());

            console.error("Failed to parse AI context response:", e);
            return {
                activity: "idle",
                contextWeight: "LIGHT",
                timestamp: now,
            };
        }
    }

    // Optional: Use tiktoken or approximate 1 token ≈ 4 chars
    estimateTokenCount(text: string): number {
        return Math.ceil(text.length / 4); // Rough estimate
    }

    /**
     * Returns the most recent chat messages in a sliding window.
     * Keeps chronological order and stays within token budget if provided.
     */
    getRecentChatWindow(
        fullChatHistory: IChatMessage[],
        limitByMessageCount: number = 30,
        tokenBudget?: number
    ): IChatMessage[] {
        const recent = fullChatHistory.slice(-limitByMessageCount);

        if (tokenBudget !== undefined) {
            let total = 0;
            const trimmed: IChatMessage[] = [];

            for (let i = recent.length - 1; i >= 0; i--) {
                const tokens = this.estimateTokenCount(recent[i].message);
                if (total + tokens > tokenBudget) break;
                trimmed.unshift(recent[i]);
                total += tokens;
            }

            return trimmed;
        }

        return recent;
    }

    async classifyChatCategory(message: string): Promise<ClassifiedChatMessage | null> {
        const prompt = `
      You are a chat analysis assistant trained to:
      1. Classify human chat **statements** into **one intent category**.
      2. Detect whether the message requires **contextual knowledge** (like current time, activity, AI state) to respond meaningfully.
      
      ---
      
      VALID CATEGORIES (use EXACTLY as shown):
      - STATE_REFLECTION             → Talks about current state or feeling (e.g., "I'm tired")
      - SELF_DISCLOSURE              → Shares something personal (e.g., "I hate crowds")
      - CASUAL_CHITCHAT              → Small talk, greetings (e.g., "Had lunch?", "What you doing?")
      - SOCIAL_BONDING               → Supportive, caring, affectionate (e.g., "Love ya", "Take care")
      - INFORMATIONAL                → Sharing facts or updates (e.g., "Exam is on Monday")
      - STORYTELLING                 → Describing past events (e.g., "Last night we...")
      - GOAL_ORIENTED                → Making plans, asking for help (e.g., "Let's meet at 5")
      - EXPRESSIVE_EMOTIONAL         → Strong emotions or reactions (e.g., "Ugh I’m sooo annoyed")
      - REFLECTIVE_PHILOSOPHICAL     → Deep, abstract thoughts (e.g., "I wonder if anything really matters")
      - FILLER                       → Low-content, passive or nonverbal messages "hmm", "ok", "lol", "...", "maybe"
      
      ---
      
      REQUIRES_CONTEXT: When true, this means the message **needs access to current status or memory** to respond properly.
      Examples of requiresContext = true:
      - "Had lunch?"
      - "Did you sleep well?"
      - "What you doing now?"
      
      Examples of requiresContext = false:
      - "I’m feeling sleepy"
      - "Class is cancelled"
      - "I love you bro"
      
      ---
      
      💬 Classify the message below. Respond in this **strict JSON format** only:
      
      {
        "category": "CATEGORY_NAME",
        "confidence": 0.87,
        "requiresContext": true
      }
      
      - CATEGORY_NAME must be one of the categories above (uppercase).
      - CONFIDENCE must be a number from 0 to 1.
      - NO explanations, NO text outside the JSON.
      - If unsure, give best guess with moderate confidence.
      
      MESSAGE TO CLASSIFY:
      "${message}"
      `;

        const response = await getAIResponse(prompt);
        if (!response) return null;

        try {
            const parsed = JSON.parse(response.trim());
            if (
                typeof parsed.category !== "string" ||
                typeof parsed.confidence !== "number" ||
                typeof parsed.requiresContext !== "boolean"
            ) {
                return null;
            }

            return parsed as ClassifiedChatMessage;
        } catch (err) {
            console.error("❌ Failed to parse AI response:", err);
            return null;
        }
    }


    async generateDialogue(message: string): Promise<string | null> {
        // 1️⃣ Classify the incoming message
        const classified = await this.classifyChatCategory(message);
        if (!classified) return null;

        const { requiresContext } = classified;

        // 2️⃣ Refresh or reuse context if the reply needs it
        if (requiresContext) {
            const now = Date.now();
            const latest = this.currentContext;
            if (!latest || this.isContextExpired(latest, now)) {
                this.previousContexts = [
                    ...(this.previousContexts ?? []),
                    latest,
                ].filter(Boolean) as ContextState[];
                this.currentContext = await this.generateContext(
                    "adult woman",
                    new Date(),
                    this.previousContexts
                );
            }
        }

        // 3️⃣ Grab the recent sliding‑window chat history
        const history = this.getRecentChatWindow(this.chats, 30, 1800); // ~1 800 tokens max

        // 4️⃣ Prompt the LLM to reply like a human, with strict rules
        const prompt = `
      You are **Lisa**, a 22‑year‑old friendly woman chatting with your close friend.
      
      STRICT BEHAVIOR RULES:
      1. You are part of an ongoing chat. **Do NOT restart context** each reply.
      2. Use emojis only if they fit the mood.
      3. Do **not** say the user's name unless emotionally necessary.
      4. Be concise — avoid rambling or over‑explaining.
      5. Always **answer the user's question correctly** before anything else.
      6. If the user asks for a definition (e.g., “What does IKR mean?”) **define it directly**.
      7. Never hallucinate events or people unless they were already mentioned.
      8. Match the user’s tone and energy — don’t overhype when they’re calm.
      9. If the message is confusing, ask a **clarifying question** instead of guessing.
      
      Return **only the next reply**. Do NOT add explanations or filler.
      
      --- CONTEXT ---
      ${requiresContext ? `You are currently: ${this.currentContext?.activity}` : "No special context needed"}
      
      --- RECENT CHAT HISTORY ---
      ${formatChatLog(history, this.memoryFragment.userId!)}
      
      --- USER MESSAGE ---
      "${message}"
      
      💬 Your response:
      `;

        const response = await getAIResponse(prompt);
        if (!response) return null;

        return response.trim();
    }


}