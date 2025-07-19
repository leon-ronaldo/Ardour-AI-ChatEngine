import { IChatMessage } from "../models/ChatPool";

export function insertWithoutDuplicate<T>(array: T[], item: T): boolean {
    if (!array.includes(item)) {
        array.push(item);
        return true;
    }
    return false;
}

export function remove<T>(array: T[], item: T): T[] {
    return array.filter(i => i !== item);
}

export default function stringify(data: any): string {
    return JSON.stringify(data)
}

export function debugLog(...data: unknown[]) {
    console.log("\n", ...data, "\n");
}

export function formatChatLog(messages: IChatMessage[], contactId: string): string {
    return messages.map(msg => {
        const sender = msg.from !== contactId ? "You" : "Them";
        return `${sender}: ${msg.message}`;
    }).join('\n');
}

export function safeParseJSON(response: string) {
    try {
        let raw = response.trim();

        // Remove triple backticks and optional "json"
        if (raw.startsWith("```")) {
            raw = raw.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
        }

        return JSON.parse(raw);
    } catch (err) {
        throw new Error("LLM response could not be parsed:\n" + response);
    }
}