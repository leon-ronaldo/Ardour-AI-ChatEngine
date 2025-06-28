import useWSS from "../main";
import { IChatMessage } from "../models/ChatPool";
import { WSChatResponse } from "../utils/types";

let chats: { [userId: string]: IChatMessage[] } = {};

export { chats };

export function ChatsRouter(data: WSChatResponse) {
    switch (data.resType) {
        case "PRIVATE_CHAT_MESSAGE":

            break;

        default:
            break;
    }
}

function chatsOperation() {
    const wss = useWSS()

    function chat() {

    }
}