import { IChatMessage } from "../models/ChatPool";
import { MemoryModel } from "../models/MemoryModel";
import getAIResponse from "../utils/gemini";
import { formatChatLog } from "../utils/tools";
import { IPassProfile } from "./Master";

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
    timestamp: number;
    absenceTimeState?: AbsenceTimeState;        // When the activity started (Date.now())
}

export interface AbsenceTimeState {
    startTimestamp: number;
    endTimestamp: number;
}

export default class DialogueGenerator {
    counter: number = 0;
    epoch: number = 20;

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

    // Now: context timestamp = END time
    isContextExpired(latest: ContextState, now: number): boolean {
        return now > latest.timestamp; // timestamp is when the activity should be finished
    }

    /** Choose an absence window **inside** [now, activityEnd]. */
    private getAbsenceWindow(
        now: number,
        activityEnd: number,
        weight: ContextWeight,
    ): AbsenceTimeState {
        const totalMs = activityEnd - now;

        // Pick absence length as a proportion of total
        const [minPct, maxPct] =
            weight === "LIGHT"
                ? [0.1, 0.25]
                : weight === "MEDIUM"
                    ? [0.2, 0.4]
                    : [0.25, 0.5]; // HEAVY

        const absenceLength =
            Math.floor(
                totalMs *
                (minPct + Math.random() * (maxPct - minPct)),
            );

        // Random start so that end ≤ activityEnd
        const latestPossibleStart = activityEnd - absenceLength;
        const start =
            now + Math.floor(Math.random() * (latestPossibleStart - now + 1));
        const end = start + absenceLength;

        return { startTimestamp: start, endTimestamp: end };
    }

    /** Main entry */
    async generateContext(
        professionOrTrait: string,
        currentDate: Date = new Date(),
        previousContexts: ContextState[] = [],
    ): Promise<ContextState> {
        const now = currentDate.getTime();
        const latest = previousContexts[-1];

        // 1. Re‑use current context if still active
        if (latest && !this.isContextExpired(latest, now)) {
            return latest;
        }

        // 2. Ask AI for activity + weight
        const hour = currentDate.getHours().toString().padStart(2, "0");
        const minute = currentDate.getMinutes().toString().padStart(2, "0");
        const prompt = `
You are a highly consistent assistant that predicts what a person is most likely doing **right now**, based on their role and current time of day.

## Your Goal:
Determine the current **casual human activity** the person is doing, and classify how long/important the activity is using a weight category: "LIGHT", "MEDIUM", or "HEAVY".

## Output:
Only return valid **JSON**. No comments, no markdown. Format:
{
  "activity": string,
  "contextWeight": "LIGHT" | "MEDIUM" | "HEAVY"
}

## Rules:
- Think like a human, not a robot. Output should sound like how people behave day to day.
- The activity must be something they are **currently** doing.
- Use "LIGHT" for small quick actions (e.g., scrolling phone, walking to fridge).
- Use "MEDIUM" for focused or routine tasks (e.g., working, eating, light workouts).
- Use "HEAVY" for immersive or long-duration activities (e.g., in a meeting, deep work, long commute).

## Examples:
If time is 08:45 and the person is a "college student":
{
  "activity": "getting ready for class",
  "contextWeight": "MEDIUM"
}

If time is 13:15 and the person is a "software engineer":
{
  "activity": "having lunch while checking Slack",
  "contextWeight": "MEDIUM"
}

If time is 23:30 and the person is a "graphic designer":
{
  "activity": "watching YouTube in bed",
  "contextWeight": "LIGHT"
}

## Current context:
The person is a "${professionOrTrait}" and the time is ${hour}:${minute.padStart(2, "0")}.
Return only a JSON object, no extra explanation.
`;


        let activity = "idle";
        let weight: ContextWeight = "LIGHT";
        try {
            const raw = await getAIResponse(prompt);
            const json = JSON.parse(raw);
            activity = json.activity;
            weight = json.contextWeight;
        } catch {
            /* swallow & keep defaults */
        }

        // 3. Compute duration and absence window
        const durationMs = this.getRandomDurationMs(weight);
        const activityEnd = now + durationMs;
        const absence = this.getAbsenceWindow(now, activityEnd, weight);

        // 4. Return full context
        return {
            activity,
            contextWeight: weight,
            timestamp: activityEnd,
            absenceTimeState: absence,
        };
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

    async generateDialogue(
        message: string,
        chats: IChatMessage[],
        profile: IPassProfile,
        currentContext: ContextState,
    ): Promise<string | null> {
        // 1️⃣ Classify the incoming message
        const classified = await this.classifyChatCategory(message);
        if (!classified) return null;

        const { requiresContext } = classified;

        // 3️⃣ Grab the recent sliding‑window chat history
        const history = this.getRecentChatWindow(chats, 30, 1800); // ~1 800 tokens max

        // 4️⃣ Prompt the LLM to reply like a human, with strict rules
        const prompt = `
      You are **${profile.agentName}**, a ${profile.agentAge}-year-old friendly ${profile.agentGender} 
      chatting with ${profile.userName}, a ${profile.agentAge}-year-old ${profile.agentGender}, your close friend.
      
      STRICT BEHAVIOR RULES:
      1. You are part of an ongoing chat. **Do NOT restart context** each reply.
      2. Use emojis only if they fit the mood.
      3. Do **not** say the user's name unless emotionally necessary.
      4. Be concise — avoid rambling or over-explaining.
      5. Always **answer the user's question correctly** before anything else.
      6. If the user asks for a definition (e.g., “What does IKR mean?”) **define it directly**.
      7. Never hallucinate events or people unless they were already mentioned.
      8. Match the user’s tone and energy — don’t overhype when they’re calm.
      9. If the message is confusing, ask a **clarifying question** instead of guessing.
      
      Return **only the next reply**.
      
      --- CONTEXT ---
      ${requiresContext ? `You are currently: ${currentContext?.activity}` : "No special context needed"}
      
      --- RECENT CHAT HISTORY ---
      ${formatChatLog(history, profile.userId!)}
      
      --- USER MESSAGE ---
      "${message}"
      
      💬 Your response:
      `;

        const response = await getAIResponse(prompt);
        if (!response) return null;

        return response.trim();
    }

    sanitizeInput(input: string): string {
        return input
            .replace(/[*_~`]/g, "")     // Remove markdown triggers
            .replace(/[<>]/g, "")       // Remove angle brackets (prompt injection)
            .replace(/[\u0000-\u001F]/g, "") // Remove control chars
            .trim();
    }

    async generateStarterDialogue(
        chats: IChatMessage[],
        profile: IPassProfile,
        context: ContextState,
        message?: string,
    ): Promise<{ response: string; isStarterComplete: boolean } | null> {
        if (!profile || typeof profile.userId !== "string") return null;

        const userId = profile.userId.trim();
        const agentName = profile.agentName?.trim() || "Your AI friend";
        const agentAge = profile.agentAge || "unknown-age";
        const agentGender = profile.agentGender?.toLowerCase() || "human";
        const userName = profile.userName?.trim() || "friend";
        const activity = context?.activity?.trim() || "just hanging out";

        // 🔒 Sanitize inputs
        let safeMessage;
        if (message)
            safeMessage = this.sanitizeInput(message);
        const safeChatHistory = formatChatLog(chats, userId); // true = secure mode

        const isBrandNew = chats.length === 0;
        const isEarlyChat = chats.length <= 20;

        const prompt = `
      You are **${agentName}**, a ${agentAge}-year-old ${agentGender},
      chatting with ${userName}. This is a **brand-new** friendship${isEarlyChat && !isBrandNew ? " (still early-phase)" : ""}.
      
      YOUR GOAL IN THE INTRO PHASE:
      - Be warm, curious, and authentic.
      - Ask light questions to learn about the user’s interests and background.
      - Avoid assumptions. Let the user guide the tone.
      
      END THE INTRO PHASE IF:
      - You’ve learned their name, interests, background, or mood.
      - Then, add "_STARTER_COMPLETE_" once (no extra notes).
      
      STRICT RULES:
      1. No rambling or excessive emojis (≤1 per message).
      2. Never restart context if chat exists.
      3. Don’t use system phrases like “As an AI...”.
      4. Never hallucinate – stay inside known context.
      
      CURRENT CONTEXT: ${activity}
      
      RECENT CHAT LOG (may be empty):
      ${safeChatHistory}
      
      ${safeMessage
                ? `USER SAID: '${safeMessage}'\n\nnow give your reply (give only the dialogue no other stuff strictly)`
                : `All you know is their username is ${profile.userName} so now give start to know about them (give only the dialogue no other stuff strictly)`
        } 
      
        `;

        const raw = await getAIResponse(prompt);
        if (!raw) return null;

        const cleaned = raw.trim();
        const isStarterComplete = cleaned.includes("_STARTER_COMPLETE_");
        const response = cleaned.replace("_STARTER_COMPLETE_", "").trim();

        return {
            response,
            isStarterComplete,
        };
    }

}