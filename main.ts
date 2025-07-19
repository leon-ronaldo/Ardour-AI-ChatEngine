import dotenv from "dotenv"
import { loadAllProfiles } from "./data/userData.service";
import { Master } from "./Agents/Master";

dotenv.config();

let agentIds: string[] = [];

function initializeAgentsAndRun() {
    agentIds = Object.keys(loadAllProfiles())

    for (var agentId of agentIds.slice()) {
        new Master(agentId);
    }
}

initializeAgentsAndRun();