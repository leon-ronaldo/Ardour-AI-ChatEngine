export type Sender = "AI" | "USER";

export type Emotion =
    | 'HAPPY'
    | 'SAD'
    | 'ANGRY'
    | 'FEAR'
    | 'SURPRISE'
    | 'DISGUST'
    | 'NEUTRAL'
    | 'EXCITED'
    | 'BORED'
    | 'CONFUSED';

export interface Chat {
    message: string,
    sender: Sender,
    timestamp: number,
    emotion: Emotion
}

export const ChatPool: Chat[] = [];