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