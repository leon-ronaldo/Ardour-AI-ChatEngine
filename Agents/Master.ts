import { loadProfile } from "../data/userData.service";
import useWSS from "../main";
import { ContactWithPreview, IChatMessage, IPassUser } from "../models/ChatPool";
import { AIProfile, UserProfile } from "../models/Profiles";
import getAIResponse from "../utils/gemini";
import stringify from "../utils/tools";
import { WSAccountRequest, WSAccountResponse, WSBaseRequest, WSBaseResponse, WSChatRequest } from "../utils/WSTypes";
import ChatHistoryAnalyser from "./ChatHistoryAnalyser";
import DialogueGenerator, { AbsenceTimeState, ContextState } from "./DialogueGenerator";
import DialogueRedefiner from "./DialogueRedefiner";

export default class Master {
    agentId: string;
    currentlyChattingUserId?: string;
    currentLivingContext?: ContextState;
    previousLivingContexts: ContextState[] = [];
    absenceTimeState?: AbsenceTimeState;
    pendingWaits: Record<string, number> = {};

    currentChats?: IChatMessage[];

    profile: AIProfile;
    currentUser?: UserProfile;

    dialogueGenerator: DialogueGenerator;
    chatHistoryAnalzer: ChatHistoryAnalyser;
    dialogueRedefiner: DialogueRedefiner;

    wss = useWSS();

    constructor(agentUserId: string) {
        this.agentId = agentUserId;
        const profile = loadProfile(agentUserId);

        if (!profile) {
            throw Error("No such agent")
        }

        this.profile = profile;

        this.dialogueGenerator = new DialogueGenerator();
        this.chatHistoryAnalzer = new ChatHistoryAnalyser();
        this.dialogueRedefiner = new DialogueRedefiner();

        this.initialize();
    }

    async initialize() {
        await this.generateCurrentLivingContext();
        this.mainLoop();
    }

    checkAbsence(): boolean {
        if (this.absenceTimeState) {
            const now = Date.now();
            return this.absenceTimeState.startTimestamp < now &&
                now < this.absenceTimeState.endTimestamp
        }
        return false;
    }

    runMainLoopAfterAbsence() {
        if (!this.absenceTimeState) {
            this.mainLoop();
            return;
        }

        const timeout = setTimeout(() => {
            this.mainLoop();
            clearTimeout(timeout);
        }, this.absenceTimeState.endTimestamp - Date.now());
    }

    async generateCurrentLivingContext() {
        this.currentLivingContext = await this.dialogueGenerator.generateContext(`${this.profile.age} years ${this.profile.gender}`, new Date(), this.previousLivingContexts);
        const timeout = setTimeout(async () => {
            this.previousLivingContexts.push(this.currentLivingContext!);
            await this.generateCurrentLivingContext();
            clearTimeout(timeout);
        }, this.currentLivingContext.timestamp - Date.now());
    }

    async decideContactToChat(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.wss.once("message", async (raw: string) => {
                const parsed = JSON.parse(raw);

                const res = parsed.data;
                if (!res || res.type !== "Account" || res.resType !== "RECENT_CHATS_LIST") {
                    console.error("Invalid WS response");
                    return reject("Unexpected WS data");
                }

                const contacts: ContactWithPreview[] = res.data?.recentChats ?? [];
                if (!contacts.length) return reject("No contacts");

                // STEP 1: Current context
                const currentContext = this.currentLivingContext!

                // STEP 2: Get user profiles for each contact
                const userProfiles: (UserProfile & { recentMessages?: IChatMessage[] })[] = contacts.map(c => {
                    const profile = this.profile.contacts[c.contact.userId];
                    return {
                        ...profile,
                        recentMessages: c.recentMessages ?? [],
                    };
                });

                // STEP 3: Build prompt
                const prompt = this.buildPrompt(currentContext, userProfiles);

                // STEP 4: Get response from AI
                const reply = await getAIResponse(prompt);

                try {
                    const selected = JSON.parse(reply);
                    if (!selected?.userId) throw new Error("Missing userId");
                    const user = userProfiles.find(u => u.id === selected.userId);
                    this.currentChats = user?.recentMessages;
                    this.currentUser = user;
                    resolve(selected.userId);
                } catch (err) {
                    console.error("AI JSON parse failed", reply);
                    reject("Invalid AI reply");
                }
            });

            const req = {
                type: "Account",
                reqType: "GET_RECENT_CHATS_LIST",
                data: {},
            };
            this.wss.send(JSON.stringify(req));
        });
    }

    async decideChattingMethod(): Promise<{ chatFirst: boolean; chatLaterTimeStamp?: number }> {

        /* ─── 0. Fetch profile ────────────────────────────────────────── */
        const userProfile: UserProfile | undefined = this.profile.contacts[this.profile.id];
        if (!userProfile) {
            console.warn(`[decideChattingMethod] ⚠️  No profile for ${this.profile.id}. Defaulting to chatFirst.`);
            return { chatFirst: true };
        }

        /* ─── 1. Fetch recent messages (may be empty) ─────────────────── */
        const recentMessages: IChatMessage[] = this.currentChats ?? [];

        /* ─── 2. Quick rule: brand‑new & high‑priority? ────────────────── */
        const isNewContact = recentMessages.length === 0;
        const isHighPriority =
            Boolean(userProfile.relationShip) ||                   // any explicit relationship
            (userProfile.lifeTrait && userProfile.lifeTrait !== "low"); // or non‑trivial lifeTrait

        if (isNewContact && isHighPriority) {
            return { chatFirst: true };   // greet them straight away
        }

        /* ─── 3. Build the AI prompt ───────────────────────────────────── */
        const userSummary = {
            userName: userProfile.name,
            id: userProfile.id,
            gender: userProfile.gender ?? null,
            relationShip: userProfile.relationShip ?? null,
            importance: userProfile.lifeTrait ?? null,
        };

        const introNote = isNewContact
            ? "NOTE: This is a brand‑new contact. We have **never** exchanged messages before."
            : "";

        const prompt = `
      You are an assistant deciding whether I should start chatting with this person now.
      
      ${introNote}
      
      USER PROFILE:
      ${JSON.stringify(userSummary, null, 2)}
      
      RECENT MESSAGES (latest 10, may be empty):
      ${JSON.stringify(recentMessages.slice(-10), null, 2)}
      
      SELECTION RULES:
      1. If we haven't talked in a while **and** they are important/close, suggest starting chat.
      2. If we just chatted very recently and they may be busy, suggest waiting.
      3. If there are no messages at all, decide by relationship importance. If they matter, suggest a friendly first message; otherwise suggest waiting.
      4. If unsure, propose a future timestamp (milliseconds since epoch) to try again.
      
      RESPONSE FORMAT (strict JSON, no markdown):
      {
        "chatFirst": boolean,
        "chatLaterTimeStamp": number // optional, only when chatFirst is false
      }`;

        /* ─── 4. Call the LLM ──────────────────────────────────────────── */
        const reply = await getAIResponse(prompt);

        /* ─── 5. Parse & validate AI response ──────────────────────────── */
        try {
            const parsed = JSON.parse(reply);

            if (typeof parsed.chatFirst !== "boolean") {
                throw new Error("Missing 'chatFirst' boolean");
            }

            // Ensure timestamp is only attached when chatFirst is false
            if (
                !parsed.chatFirst &&
                typeof parsed.chatLaterTimeStamp !== "number"
            ) {
                // AI forgot a timestamp → add default (15 min later)
                parsed.chatLaterTimeStamp = Date.now() + 15 * 60 * 1000;
            }

            return {
                chatFirst: parsed.chatFirst,
                ...(parsed.chatLaterTimeStamp
                    ? { chatLaterTimeStamp: parsed.chatLaterTimeStamp }
                    : {}),
            };
        } catch (err) {
            console.error("❌ Could not parse AI reply:", reply, err);
            // Safe fallback: better to engage now than stall forever
            return { chatFirst: true };
        }
    }

    private buildPrompt(
        currentContext: Record<string, any>,
        userProfiles: (UserProfile & { recentMessages?: IChatMessage[] })[]
    ): string {
        return `
    You are an assistant that selects the best person I should talk to now.
    
    CURRENT CONTEXT:
    ${JSON.stringify(currentContext, null, 2)}
    
    USER PROFILES:
    ${JSON.stringify(userProfiles.map(u => ({
            name: u.name,
            id: u.id,
            age: u.age ?? null,
            gender: u.gender ?? null,
            personalTraits: u.personalTraits ?? [],
            lifeTrait: u.lifeTrait ?? null,
            relationShip: u.relationShip ?? null,
            recentMessages: u.recentMessages ?? [],
        })), null, 2)}
    
    SELECTION RULES (priority):
    1. Match the current context (e.g. if I’m playing games, pick my best friend).
    2. Relevance of conversation to the current context.
    3. (Skip unread messages for now.)
    4. Importance or closeness (if available).
    5. Recent message history (if any).
    6. Combine recency + importance if multiple match.
    7. If all else is equal, pick randomly.
    
    Return ONLY this JSON format (no text or markdown):
    
    {
      "userId": "string"
    }`;
    }

    fetchMessages(): Promise<IChatMessage[]> {
        return new Promise((resolve, reject) => {
            this.wss.once("message", (message: string) => {
                let parsedData;

                try {
                    parsedData = JSON.parse(message);
                } catch (err) {
                    return reject("Failed to parse message");
                }

                const data = parsedData?.data;
                if (!data) {
                    console.log("no data dii!");
                    return reject("No data in response");
                }

                if (data.type !== "Account") {
                    console.log("not an account res pa");
                    return reject("Invalid data type");
                }

                const res = data as WSAccountResponse;

                if (res.resType !== "PRIVATE_CHAT_HISTORY") {
                    console.log("private chat history kidaikala");
                    return reject("Unexpected response type");
                }

                this.currentChats = res.data.messages;
                resolve(this.currentChats);
            });

            if (!this.currentUser) {
                return reject("No current user selected");
            }

            const request: WSAccountRequest = {
                type: "Account",
                reqType: "PRIVATE_CHAT_HISTORY",
                data: {
                    userId: this.currentUser.id,
                },
            };

            this.wss.send(stringify(request));
        });
    }

    sendTyping(isTyping: boolean) {
        const res: WSChatRequest = {
            type: "Chat",
            reqType: "SET_IS_TYPING",
            data: {
                isTyping, recieverId: this.currentUser?.id!
            }
        }
        this.wss.send(stringify(res))
    }

    sendOnline() {
        const isOnline = !this.checkAbsence()

        const res: WSChatRequest = {
            type: "Chat",
            reqType: "SET_IS_ONLINE",
            data: {
                isOnline, recieverId: this.currentUser?.id!
            }
        }
        this.wss.send(stringify(res))
    }

    async startChat() {
        this.sendOnline();
        await this.fetchMessages();
        if ((this.currentChats?.length ?? 0) < 15) {
            this.dialogueGenerator.generateStarterDialogue(this.currentChats!, this.currentUser!, this.profile, this.currentLivingContext!)
        }
    }


    async mainLoop() {
        if (this.checkAbsence()) { this.runMainLoopAfterAbsence(); return };

        await this.decideContactToChat();
        const { chatFirst, chatLaterTimeStamp } = await this.decideChattingMethod();

        if (!chatFirst && chatLaterTimeStamp) {
            const timeout = setTimeout(() => {
                this.startChat();
                clearTimeout(timeout)
            }, chatLaterTimeStamp);

            this.mainLoop();
            return
        }

        this.startChat();
    }
}