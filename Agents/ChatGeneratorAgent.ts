import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConversationChain } from "langchain/chains";
import { BufferWindowMemory, ConversationSummaryMemory } from "langchain/memory";
import { AIProfile, UserProfile } from "../models/Profiles";
import { loadSummaryForDays } from "../data/userData.service";
import { getPreviousFormattedDatesFromToday } from "../utils/tools";
import { ChatDataSummary } from "../models/ChatModels";

interface ChatTools {
    contact: UserProfile;
    currentChattingMemory: BufferWindowMemory;
    conversationChain: ConversationChain;
    conversationSummaryMemory: BufferWindowMemory;
    summaryChain: ConversationChain;
    summaries: { [date: string]: ChatDataSummary[] };
}

export class ChatGeneratorAgent {
    agent: AIProfile;
    chatBranches: { [contactId: string]: ChatTools } = {};

    constructor(agent: AIProfile) {
        this.agent = agent;
    }

    llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: "AIzaSyBMlGsH4vA9gcEimwnOyMTAFcPZ33J3akI",
        temperature: 0.7,
    });


    addChatBranch(userProfile: UserProfile) {
        const chattingMemory = new BufferWindowMemory({ k: 20, memoryKey: "chat_history" })
        const summaryMemory = new BufferWindowMemory({ k: 20, memoryKey: "chat_summary" })

        const previousSummaries = loadSummaryForDays(this.agent.id, userProfile.id, getPreviousFormattedDatesFromToday(4))
        
        const memoryObject: ChatTools = {
            contact: userProfile,
            currentChattingMemory: chattingMemory,
            conversationChain: new ConversationChain({ memory: chattingMemory, llm: this.llm }),
            conversationSummaryMemory: summaryMemory,
            summaryChain: new ConversationChain({ memory: summaryMemory, llm: this.llm }),
            summaries: previousSummaries ?? {}
        }

        this.chatBranches[userProfile.id] = memoryObject
    }

    
}   