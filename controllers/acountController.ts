import { loadData, saveData } from "../data/userData.service";
import useWSS, { credentials } from "../main";
import stringify, { debugLog } from "../utils/tools";
import { AccountReqType, WSAccountRequest, WSAccountResponse } from "../utils/types";
import { chats } from "./chatController";

export function AccountsRouter(data: WSAccountResponse) {
    switch (data.resType) {
        case "CONTACT_LIST":
            debugLog("contacts list for", credentials.email, ":", data.data.contacts.map(contact => ({ userId: contact.userId, userName: contact.userName })))
            const users = loadData();
            const newUsers = users.map(user => { if (user.userId === credentials.userId) return { ...user, contacts: data.data.contacts }; else return user })
            saveData(newUsers)
            break;
        case "PRIVATE_CHAT_HISTORY":
            const savedContacts = loadData()
            const currentUser = savedContacts.find(user => credentials.userId === user.userId)
            const chattingUser = currentUser?.contacts?.find(account => account.userId === data.data.userId)
            debugLog("Messages with", chattingUser?.userName, "stored")

            chats[data.data.userId] = data.data.messages;
            break;
        default:
            break;
    }

}

export default function accountsOperations() {
    const wss = useWSS()

    function getAllContacts() {
        const response: WSAccountRequest = {
            type: "Account",
            reqType: "GET_CONTACTS",
            data: {}
        }
        wss.send(stringify(response))
    }

    function getPrivateChatHistory() {
        const response: WSAccountRequest = {
            type: "Account",
            reqType: "PRIVATE_CHAT_HISTORY",
            data: {
                userId: "684b0ab50e2c9ca1d99925c0"
            }
        }
        wss.send(stringify(response))
    }

    return {
        getAllContacts,
        getPrivateChatHistory
    }
}