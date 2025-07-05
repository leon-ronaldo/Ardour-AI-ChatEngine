import { AgentCreds, loadData } from "../data/userData.service";
import useWSS from "../main";
import { ContactWithPreview, IChatMessage, IPassUser } from "../models/ChatPool";
import { MemoryModel } from "../models/MemoryModel";
import getAIResponse from "../utils/gemini";
import stringify from "../utils/tools";
import { WSAccountRequest, WSAccountResponse, WSBaseRequest, WSBaseResponse } from "../utils/types";
import ChatHistoryAnalyser from "./ChatHistoryAnalyser";
import DialogueGenerator, { AbsenceTimeState, ContextState } from "./DialogueGenerator";
import DialogueRedefiner from "./DialogueRedefiner";

export type IPassProfile = {
    agentId: string;
    userId?: string;
    agentName: string;
    userName?: string;
    agentAge: string | number;
    agentGender: "male" | "female";
    userAge?: string | number;
    userGender?: "male" | "female";
}

export default class Master {
    agentId: string;
    currentlyChattingUserId?: string;
    currentLivingContext?: ContextState;
    previousLivingContexts: ContextState[] = [];
    absenceTimeState?: AbsenceTimeState;

    currentChats?: IChatMessage[];
    memoryFragment?: MemoryModel;

    profile: IPassProfile;

    dialogueGenerator: DialogueGenerator;
    chatHistoryAnalzer: ChatHistoryAnalyser;
    dialogueRedefiner: DialogueRedefiner;

    credentials: AgentCreds;
    wss = useWSS();

    constructor(agentUserId: string) {
        this.agentId = agentUserId;
        const creds = loadData();
        this.credentials = creds.find(cred => cred.userId === agentUserId)!;

        this.profile = {
            agentId: agentUserId,
            agentAge: this.credentials.age,
            agentGender: this.credentials.gender,
            agentName: this.credentials.name,
        };

        this.dialogueGenerator = new DialogueGenerator();
        this.chatHistoryAnalzer = new ChatHistoryAnalyser();
        this.dialogueRedefiner = new DialogueRedefiner();

        this.initialize();
    }

    async initialize() {
        await this.generateCurrentLivingContext();
        this.mainLoop();
    }

    async generateCurrentLivingContext() {
        this.currentLivingContext = await this.dialogueGenerator.generateContext(`${this.profile.agentAge} years ${this.profile.agentGender}`, new Date(), this.previousLivingContexts);
        this.absenceTimeState = this.currentLivingContext?.absenceTimeState;
        const timeout = setTimeout(async () => {
            this.previousLivingContexts.push(this.currentLivingContext!);
            await this.generateCurrentLivingContext();
            clearTimeout(timeout);
        }, this.currentLivingContext.timestamp - Date.now());
    }

    async decideContactToChat() {
        this.wss.once("message", async (message: string) => {
            let parsedData = JSON.parse(message);

            if (!parsedData.data) {
                console.log("data varla bro ena bro!");
                return;
            }

            const res = parsedData.data as WSAccountResponse;

            if (res.type !== "Account" || res.resType !== "RECENT_CHATS_LIST") {
                console.log("elavu bro sathiyama");
                return;
            }

            function buildPrompt(contacts: ContactWithPreview[]): string {
                const systemInstructions = `
              You are an assistant who selects the most important person for me to reply to now.
              
              RULES for selection:
              1. Reply to the person with the most recent message.
              2. If two contacts are recent, prefer messages with most relevance.
              3. If still tied, break ties alphabetically by userName.
              4. If still tied, make a random selection by your interest
              
              FORMAT:
              Return ONLY a single JSON object in this format:
              {
                "userName": "string",
                "userId": "string",
              }
              DO NOT include extra text, explanations, or markdown formatting.
              `;

                const contactsJson = contacts.map(c => ({
                    userName: c.contact.userName,
                    userId: c.contact.userId,
                    profileImage: c.contact.profileImage ?? null,
                    recentMessages: (c.recentMessages ?? []).map(m => ({
                        from: m.from,
                        to: m.to,
                        message: m.message,
                        timestamp: m.timestamp,
                    })),
                }));

                return `${systemInstructions}\n\nContacts:\n${JSON.stringify(contactsJson, null, 2)}`;
            }

            const contacts = res.data.recentChats;

            if (contacts.length === 0) {
                throw new Error('No contacts bro!');
            }

            if (!contacts.length) throw new Error('No contacts provided!');

            const prompt = buildPrompt(contacts);

            const reply = await getAIResponse(prompt);

            let selected: IPassUser;

            try {
                selected = JSON.parse(reply);

                if (!(selected as IPassUser)) {
                    throw new Error("not valid IPassUser")
                }

                this.profile.userId = selected.userId;
                this.profile.userName = selected.userName;
            } catch (err) {
                console.error('Failed to parse AI response:', reply);
                throw new Error('Invalid JSON from AI');
            }
        })

        const request: WSAccountRequest = {
            type: "Account",
            reqType: "GET_RECENT_CHATS_LIST",
            data: {}
        }

        this.wss.send(stringify(request))
    }

    async mainLoop() {
        await this.decideContactToChat();
        let fragment = this.credentials.memoryFragments.find(fragment => fragment.profile.userId === this.profile.userId)

        if (!fragment) {
            fragment = {
                profile: { ...this.profile },
                knowThem: false
            }
        }

        this.wss.once("message", (message: string) => {
            let parsedData = JSON.parse(message)

            if (!parsedData.data) {
                console.log("no data dii!");
                return;
            }

            if (parsedData.data.type !== "Account") {
                console.log("not an account res pa")
                return;
            }

            const res = parsedData.data as WSAccountResponse;

            if (res.resType !== "PRIVATE_CHAT_HISTORY") {
                console.log("private chat history kidaikala")
                return;
            }

            this.currentChats = res.data.messages;
        })

        const request: WSAccountRequest = {
            type: "Account",
            reqType: "PRIVATE_CHAT_HISTORY",
            data: {
                userId: this.profile.userId!
            }
        }

        this.wss.send(stringify(request))

    }

    stopActivityTill(timestamp: number) {
        const timeout = setTimeout(() => {
            this.resumeActivity();
            clearTimeout(timeout)
        }, timestamp - Date.now());
    }

    async resumeActivity() {

    }
}