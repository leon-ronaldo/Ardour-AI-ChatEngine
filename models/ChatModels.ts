export type Sender = "AI" | "USER";

export enum Emotion {
    Happy = "happy",
    Sad = "sad",
    Angry = "angry",
    Calm = "calm",
    Anxious = "anxious",
    Excited = "excited",
    Unknown = "unknown",
}

export interface Media {
    type: "STICKER" | "GIF",
    genre: "FUNNY" | "MEME" | "ANGRY" | "SAD" | "EXCITED"
}


export interface Chat {
    message: string,
    sender: Sender,
    timestamp: number,
    emotion: Emotion
}

export const ChatPool: Chat[] = [];