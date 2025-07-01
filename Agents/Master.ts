import { AgentCreds, loadData } from "../data/userData.service";
import useWSS from "../main";
import { IChatMessage } from "../models/ChatPool";
import { MemoryModel } from "../models/MemoryModel";
import { WSAccountRequest } from "../utils/types";
import ChatHistoryAnalyser from "./ChatHistoryAnalyser";
import DialogueGenerator, { ContextState } from "./DialogueGenerator";
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
        this.credentials = creds.find(cred => cred.userId === agentUserId)!

        this.profile = {
            agentId: agentUserId,
            agentAge: this.credentials.age,
            agentGender: this.credentials.gender,
            agentName: this.credentials.name
        }

        this.dialogueGenerator = new DialogueGenerator()
        this.chatHistoryAnalzer = new ChatHistoryAnalyser()
        this.dialogueRedefiner = new DialogueRedefiner()

        this.generateCurrentLivingContext().then(() => this.decideFirstContactToChat());
    }

    async generateCurrentLivingContext() {
        this.currentLivingContext = await this.dialogueGenerator.generateContext(`${this.profile.agentAge} years ${this.profile.agentGender}`, new Date(), this.previousLivingContexts);
        const timeout = setTimeout(async () => {
            this.previousLivingContexts.push(this.currentLivingContext!);
            await this.generateCurrentLivingContext();
            clearTimeout(timeout);
        }, this.currentLivingContext.timestamp);
    }

    async decideFirstContactToChat() {
        // send request to fetch all messages 
        this.wss.once("message", () => {

        })
    }
}