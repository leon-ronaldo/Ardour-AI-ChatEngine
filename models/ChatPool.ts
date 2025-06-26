export interface IChatMessage {
  from: string;
  to: string;
  message: string;
  timestamp: number; // use Date.now() when storing
}

export interface IChatPool extends Document {
  chatId: string; // shared chat ID between two users
  participants: [string, string]; // user IDs (sorted alphabetically for consistency)
  messages: IChatMessage[];
}
