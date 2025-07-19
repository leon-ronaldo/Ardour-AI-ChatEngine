import { loadProfile, loadTrait, saveProfile } from "../data/userData.service";
import { AIProfile, AITrait } from "../models/Profiles";
import { AbsenceTimeState, ContextState } from "../models/PersonalTraits";
import { ContactMatrixAgent } from "./ContactMatrixAgent";
import { ContactWithPreview } from "../models/ChatPool";
import WebSocket from "ws"
import { WSAccountRequest, WSAccountResponse } from "../utils/WSTypes";
import stringify from "../utils/tools";
import { ContactDecisionMatrix } from "../models/CharacterTraits";


export class Master {

    agent: AIProfile;
    agentCharacterTrait: AITrait;
    contactMatrix: ContactDecisionMatrix[] = [];
    currentLivingState!: ContextState;
    previousLivingStates: ContextState[] = [];
    contactMatrixAgent: ContactMatrixAgent = new ContactMatrixAgent();
    absenceTimeState?: AbsenceTimeState;
    recentMessages!: ContactWithPreview[];
    wss!: WebSocket;
    currentlyIsOffline: boolean = false;
    noAgentImplementedError: Error = new Error(`No agent implemented`)

    constructor(id: string) {
        this.agent = loadProfile(id)!;
        this.agentCharacterTrait = loadTrait(id)!;


        // connect server and initialize
        this.runWhenOnline(() => this.initializeMessagesAndGenerateContactMatrix());
    }

    async connectServer(): Promise<void> {
        if (!this.agent) throw this.noAgentImplementedError;

        const socketURL = `ws://localhost:8055/?token=${this.agent.accessToken}`;
        this.wss = new WebSocket(socketURL);

        return new Promise((resolve, reject) => {
            this.wss.addEventListener("open", () => {
                console.log(`✅ WebSocket connected for agent ${this.agent.name}`);

                // Attach handlers
                this.wss.addEventListener("message", this.handleMessage);
                this.wss.addEventListener("close", this.handleClose);
                this.wss.addEventListener("error", (e) => console.error("WebSocket error:", e));
            });

            this.wss.addEventListener("message", (event) => {
                try {
                    const data = JSON.parse(event.data.toString());

                    if ((data.code ?? 4000) === 2000) {
                        console.log(`✅ CONNECTION_SUCCESSFUL message received for agent ${this.agent.id}: ${this.agent.name}`);
                        resolve();
                    }
                } catch (e) {
                    console.warn("⚠️ Could not parse WebSocket message:", event.data);
                }
            });

            this.wss.addEventListener("error", (e) => {
                reject(`WebSocket failed to connect: ${e}`);
            });
        });
    }

    handleMessage = (event: WebSocket.MessageEvent) => {
        const parsed = JSON.parse(event.data.toString());

        if (parsed.message && parsed.code === 2000) {
            console.log(`Init message received for agent ${this.agent.id}: ${this.agent.name}`);
        }

        if (parsed.data) {
            // Process server data
            console.log("Received data:", parsed.data);
        }

        if (parsed.error) {
            console.error("Server error:", parsed.error);
        }
    }

    handleClose = async (event: WebSocket.CloseEvent) => {
        console.warn(`WebSocket closed for agent ${this.agent.id}: ${this.agent.name} - [${event.code}] ${event.reason}`);

        const retryable = [4001, 4002, 4003];

        if (retryable.includes(event.code)) {
            console.log(`Attempting re-authentication... for agent ${this.agent.id}: ${this.agent.name}`);
            this.authenticateAndStore()
        }
    }

    async authenticateAndStore(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const authWS = new WebSocket("ws://localhost:8055/authenticate");

            authWS.addEventListener("open", () => {
                console.log(`Connected to auth server for agent ${this.agent.id}: ${this.agent.name}`);
            });

            authWS.addEventListener("message", event => {
                console.log("🔵 Incoming WebSocket message:", event.data);

                let message;
                try {
                    message = JSON.parse(event.data.toString());
                    console.log("📦 Parsed message object:", message);
                } catch (error) {
                    console.error("❌ Failed to parse WebSocket message:", error);
                    return;
                }

                // Handle initial authentication challenge
                if (message.code === 2001) {
                    console.log("🟡 Received authentication challenge (code 2001)");

                    const request = {
                        type: "Authentication",
                        reqType: "AUTHENTICATE_WITH_PASSWORD",
                        data: {
                            email: this.agent.email,
                            password: this.agent.password
                        }
                    };

                    console.log("📤 Sending authentication request:", request);
                    authWS.send(JSON.stringify(request));
                }

                // Handle authentication response with tokens
                if (message.data && message.data.resType === "AUTH_TOKENS") {
                    console.log("🟢 Received authentication tokens");

                    const newCreds = message.data.data;

                    this.agent = {
                        ...this.agent,
                        ...newCreds
                    };

                    console.log(`✅ Authentication successful for agent ID ${this.agent.id}: ${this.agent.name}`);
                    console.log("💾 Saving profile...");
                    saveProfile(this.agent);

                    console.log("🔄 Closing auth WebSocket and reconnecting main server...");
                    authWS.close();

                    this.connectServer();
                    resolve();
                }
            });


            authWS.addEventListener("error", err => {
                console.error("Auth WS failed", err);
                reject(err);
            });
        });
    }

    async getRecentMessages(): Promise<ContactWithPreview[]> {
        return new Promise<ContactWithPreview[]>((resolve, reject) => {
            const req: WSAccountRequest = {
                type: "Account",
                reqType: "GET_RECENT_CHATS_LIST",
                data: {}
            };

            this.wss.once("message", data => {
                let res = JSON.parse(data.toString());

                if (!res.data) {
                    reject(`Invalid Data for agent ${this.agent.id} : ${this.agent.name}`)
                }

                if (res.data?.type !== "Account") {
                    reject(`Invalid data type for agent ${this.agent.id} : ${this.agent.name}`)
                }

                const parsedData = res.data as WSAccountResponse;

                if (parsedData.resType === "RECENT_CHATS_LIST") {
                    resolve(parsedData.data.recentChats as ContactWithPreview[])
                } else {
                    reject(`Invalid recent chats data for agent ${this.agent.id} : ${this.agent.name}`)
                }
            })

            this.wss.send(stringify(req))
        })
    }

    getTimeInterval(timestamp: number): number {
        const now = Date.now()
        return timestamp > now ? timestamp - now : now - timestamp;
    }

    setOffline() {
        if (this.absenceTimeState) {
            const startTimeout = setTimeout(() => {
                this.currentlyIsOffline = true;
                clearTimeout(startTimeout);
            }, this.getTimeInterval(this.absenceTimeState.startTimestamp));

            const endTimeout = setTimeout(() => {
                this.currentlyIsOffline = false;
                clearTimeout(endTimeout); this.runWhenOnline(() => this.initializeMessagesAndGenerateContactMatrix())
            }, this.getTimeInterval(this.absenceTimeState.endTimestamp));
        }
    }

    runWhenOnline(callBack: () => void) {
        if (!this.currentlyIsOffline) {
            callBack();
            return;
        }

        console.warn(`Skipped execution for agent ${this.agent.id}: ${this.agent.name} \n\n\n`)
    }

    async initializeMessagesAndGenerateContactMatrix() {
        await this.connectServer();
        this.recentMessages = await this.getRecentMessages();

        // generate current living state
        this.currentLivingState = await this.contactMatrixAgent.constructLivingState(this.agent, this.previousLivingStates)
        this.absenceTimeState = this.currentLivingState.absenceTimeState;
        this.previousLivingStates.push(this.currentLivingState)
        console.log(`Current state for agent ${this.agent.id}: ${this.agent.name} \n\n\n`);
        console.log(this.currentLivingState);
        console.log("\n\n\n");
        console.log(this.absenceTimeState);
        console.log("\n\n\n");

        this.setOffline()

        // generate the next context after current one expires
        const regenerateLivingStateTimeout = setTimeout(async () => {
            this.currentLivingState = await this.contactMatrixAgent.constructLivingState(this.agent, this.previousLivingStates);
            this.setOffline();
            clearTimeout(regenerateLivingStateTimeout);
        }, this.getTimeInterval(this.currentLivingState.timestamp));

        // generate contact matrix
        this.contactMatrix = await this.contactMatrixAgent.constructContactMatrix(
            this.agent,
            this.currentLivingState,
            this.recentMessages,
            this.agentCharacterTrait.behavioralProfile,
            this.agentCharacterTrait.corePersonality,
            this.agentCharacterTrait.relationShipDecisionSummary
        )

        console.log(`Contact matrix for agent ${this.agent.id}: ${this.agent.name} \n\n\n`);
        console.log(this.contactMatrix);
        console.log("\n\n\n");

        this.runWhenOnline(() => this.mainLoop())
    }

    mainLoop() {
        for (var matrix of this.contactMatrix) {
            if (matrix.recommendedAction === "TEXT_FIRST") {
                this.runWhenOnline(() => this.startChat());
            }

            if (matrix.recommendedAction === "WAIT" && matrix.waitToMessageTill) {
                const waitMessageTimer = setTimeout(() => {
                    this.runWhenOnline(() => this.startChat());
                    clearTimeout(waitMessageTimer);
                }, this.getTimeInterval(matrix.waitToMessageTill))
            }
        }
    }

    startChat() {
        
    }
}