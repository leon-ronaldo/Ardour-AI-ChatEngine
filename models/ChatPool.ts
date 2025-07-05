export interface IPassUser {
  userName: string,
  userId: string,
  profileImage?: string
}

export interface IChatMessage {
  from: string;
  to: string;
  message: string;
  timestamp: number; // use Date.now() when storing
}

export type ContactWithPreview = {
  contact: IPassUser;
  recentMessages?: IChatMessage[]; // only present for top‑5 contacts
};

export interface IChatPool extends Document {
  chatId: string; // shared chat ID between two users
  participants: [string, string]; // user IDs (sorted alphabetically for consistency)
  messages: IChatMessage[];
}
