import dotenv, { parse } from "dotenv"
import WebSocket from "ws"
import { WSAuthentiacationResponse, WSAuthenticationRequest, WSBaseResponse, WSServerResponse } from "./utils/types";
import stringify, { insertWithoutDuplicate } from "./utils/tools";
import { AgentCreds, loadData, saveData } from "./data/userData.service";
import { AccountsRouter } from "./controllers/acountController";
import { ChatsRouter } from "./controllers/chatController";
import InitTestApp from "./Tests/testApp";

dotenv.config()

export let credentials: AgentCreds = {
    name: "Lisa Chen",
    age: 22,
    gender: "female",
    email: "lisa.chen@example.com",
    password: "lisa@ardour",
    userId: "",
    profileImage: "",
    accessToken: "",
    refreshToken: "",
    memoryFragments: [],
    characterTrait: {}
}

let wss: WebSocket;

export default function useWSS() {
    if (!wss) {
        throw Error("connection to server is not initialized")
    }

    return wss;
}

function connectServer() {

    const AgentCreds = loadData()
    const lisaCreds = AgentCreds.find(userCred => userCred.email === "lisa.chen@example.com")

    if (!lisaCreds) {
        handleAuthentication()
        return
    } else {
        credentials = lisaCreds;
    }

    wss = new WebSocket(`${process.env.BACKEND_URI as string}/?token=${credentials.accessToken}`);
    wss.addEventListener("message", handleMessage)
    wss.addEventListener("close", handleClose)
}

function handleMessage(message: WebSocket.MessageEvent) {
    // console.log("recieved from server", message.data.toString());
    const parsedData = JSON.parse(message.data.toString());

    if (parsedData.data) {
        // use data from server
    }
    if (parsedData.message) {
        console.log("recieved a message", parsedData);
        if (parsedData.code === 2000) {
            InitTestApp()
        }
    }
    if (parsedData.error) { }
}

function handleClose(event: WebSocket.CloseEvent) {
    console.warn(`Server Closed\nClose code: ${event.code}\nReason: ${event.reason}`);

    if (event.code === 4002 || event.code === 4003 || event.code === 4001) {
        handleAuthentication()
    }
}

function handleAuthentication() {
    wss = new WebSocket(process.env.AUTHENTICATION_URI as string);

    wss.addEventListener("message", event => {
        const parsedMessage = JSON.parse(event.data.toString());
        if (parsedMessage.code === 2001) {
            const request: WSAuthenticationRequest = {
                type: "Authentication",
                reqType: "AUTHENTICATE_WITH_PASSWORD",
                data: { email: credentials.email, password: credentials.password }
            }

            wss.send(stringify(request));
        }

        if (parsedMessage.data) {
            const data = parsedMessage.data as WSAuthentiacationResponse;
            if (data.resType === "AUTH_TOKENS") {
                credentials = {
                    ...credentials,
                    ...data.data
                }

                let AgentCreds = loadData()
                saveData(AgentCreds.map(cred => { if (cred.email === credentials.email) return credentials; else return cred }))
            }

            wss.close()
            connectServer()
        }
    })
}

function router(data: any) {

    let parsedData: WSServerResponse;

    try {
        parsedData = data
    } catch (e) {
        return console.error(e);
    }

    switch (parsedData.type) {
        case "Account":
            return AccountsRouter(parsedData);
        case "Chat":
            return ChatsRouter(parsedData);
        case "Notification":
            return
        default:
            return;
    }
}

connectServer()