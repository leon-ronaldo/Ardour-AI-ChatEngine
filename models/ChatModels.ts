export type Sender = "AI" | "USER";

export type Emotion =
    | "happy"
    | "sad"
    | "angry"
    | "calm"
    | "anxious"
    | "excited"
    | "unknown";


export interface Media {
    type: "STICKER" | "GIF",
    genre: "FUNNY" | "MEME" | "ANGRY" | "SAD" | "EXCITED"
}

export interface ChatDataSummary {
    contactId: string;
    timePeriod: {
        from: number,
        to: number,
    };
    summary: string;
    keyWords: string[];
    mentionedPeople: string[];
    mentionedIncidents: string[];
    emotionDescription: string;
}