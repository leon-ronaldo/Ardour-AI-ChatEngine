export interface IGroupChatMessage {
    from: string;
    message: string;
    timestamp: number;
    groupId: string;
}

export interface IGroupChatParticipant {
    userId: string;
    joinedOn: number;
}

export interface IGroupChatPool extends Document {
    groupId: string; // Unique group ID
    name: string;    // Group name
    participants: IGroupChatParticipant[]; // List of user IDs
    messages: IGroupChatMessage[];
    createdOn: number;
}
