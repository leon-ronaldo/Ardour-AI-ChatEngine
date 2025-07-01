import WebSocket from "ws"
import { WSAccountRequest, WSBaseRequest, WSBaseResponse } from '../utils/types';
import useWSS, { credentials } from '../main';
import { IChatMessage } from '../models/ChatPool';
import getAIResponse from '../utils/gemini';
import { baseChattingPrompt } from '../utils/Prompts';
import { MemoryModel } from "../models/MemoryModel";
import DialogueGenerator from "../Agents/DialogueGenerator";
import DialogueRedefiner from "../Agents/DialogueRedefiner";

const targetUserId = "684b0ab50e2c9ca1d99925c0"; // 👈 Replace this or make it dynamic
let messages: IChatMessage[] = [];
let memoryFragment: MemoryModel;

// ------------------------------------------
// 🔷 Init Entry
// ------------------------------------------

export default function InitTestApp() {
    const wss = useWSS();

    requestChatHistory(wss);
    listenToIncomingMessages(wss);
}

function requestChatHistory(wss: WebSocket) {
    const historyReq: WSAccountRequest = {
        type: "Account",
        reqType: "PRIVATE_CHAT_HISTORY",
        data: { userId: targetUserId },
    };

    wss.send(JSON.stringify(historyReq));
}

function listenToIncomingMessages(wss: WebSocket) {

    wss.addEventListener("message", async (event: any) => {
        const parsed = (JSON.parse(event.data.toString())).data;

        if (parsed?.resType === "PRIVATE_CHAT_HISTORY") {
            const res = parsed as WSBaseResponse<"Account", "PRIVATE_CHAT_HISTORY", { userId: string, messages: IChatMessage[] }>;
            console.log(`\n📜 Chat history with ${targetUserId}:`);
            messages = res.data.messages;
            res.data.messages.forEach((msg: any) => printChat(msg));
        }

        if (parsed?.resType === "PRIVATE_CHAT_MESSAGE") {
            const res = parsed as WSBaseResponse<"Chat", "PRIVATE_CHAT_MESSAGE", IChatMessage>;
            printChat(res.data);
        }
    });
}

function printChat(msg: IChatMessage) {
    const sender = msg.from === credentials.userId ? '🟦 You' : '🟥 Them';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    console.log(`[${time}] ${sender}: ${msg.message}`);
}

// ------------------------------------------
// ✉️ Send Message Utility (Exported)
// ------------------------------------------
export function sendMessage(messageText: string) {
    const wss = useWSS();

    const msg: IChatMessage = {
        from: credentials.userId!,
        to: targetUserId,
        message: messageText,
        timestamp: Date.now(),
    };

    const request: WSBaseRequest<"Chat", "SEND_MSG", IChatMessage> = {
        type: "Chat",
        reqType: "SEND_MSG",
        data: msg,
        meta: { timestamp: Date.now() }
    };

    wss.send(JSON.stringify(request));
}
