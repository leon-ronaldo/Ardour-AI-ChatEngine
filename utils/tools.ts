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

export function getFormattedToday(): string {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const yyyy = today.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
}

export function getPreviousFormattedDatesFromToday(n: number): string[] {
    const dates: string[] = [];
    const today = new Date();

    for (let i = 0; i < n; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const yyyy = date.getFullYear();

        dates.push(`${dd}-${mm}-${yyyy}`);
    }

    return dates;
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