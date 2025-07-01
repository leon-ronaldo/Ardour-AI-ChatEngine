import * as fs from 'fs';
import * as path from 'path';
import { MemoryModel } from '../models/MemoryModel';
import { HumanCharacterProfile } from '../models/HumanProfile';

const DATA_PATH = path.join(__dirname, 'users.json');

export type AgentCreds = {
    name: string,
    age: string | number,
    gender: "male" | "female",
    email: string,
    password: string,
    userId?: string,
    profileImage?: string,
    accessToken?: string,
    refreshToken?: string,
    contacts?: { userId: string, userName: string }[],
    memoryFragments: MemoryModel[],
    characterTrait: HumanCharacterProfile
};

export function saveData(data: AgentCreds[]) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log('✅ Data saved.');
}

export function loadData(): AgentCreds[] {
    if (!fs.existsSync(DATA_PATH)) return [];
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}
