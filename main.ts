import dotenv, { parse } from "dotenv"
import WebSocket from "ws"
import { WSAuthentiacationResponse, WSAuthenticationRequest } from "./utils/types";
import stringify, { insertWithoutDuplicate } from "./utils/tools";
import { UserCreds, loadData, saveData } from "./data/userData.service";

dotenv.config()

let credentials: UserCreds = {
    email: "lisa.chen@example.com",
    password: "lisa@ardour",
    userId: "",
    profileImage: "",
    accessToken: "",
    refreshToken: "",
}

let wss: WebSocket;

function connectServer() {

    const userCreds = loadData()
    const lisaCreds = userCreds.find(userCred => userCred.email === "lisa.chen@example.com")

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
    console.log("data from server", message.data);
    const parsedData = JSON.parse(message.data.toString());

    if (parsedData.data) { }
    if (parsedData.message) { }
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

                const userCreds = loadData()
                insertWithoutDuplicate(userCreds, credentials);
                saveData(userCreds)
            }

            wss.close()
            connectServer()
        }
    })
}

connectServer()