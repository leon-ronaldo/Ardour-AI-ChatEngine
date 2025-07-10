import * as fs from 'fs';
import * as path from 'path';
import { AIProfile } from '../models/Profiles';

const DATA_PATH = path.join(__dirname, 'users.json');

export function saveProfile(data: AIProfile) {
    let allProfiles = loadAllProfiles()
    allProfiles[data.id] = data;
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log('✅ Data saved.');
}

export function loadProfile(id: string): AIProfile | undefined {
    if (!fs.existsSync(DATA_PATH)) return;
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return (JSON.parse(raw))[id];
}

export function loadAllProfiles(): { [id: string]: AIProfile } {
    if (!fs.existsSync(DATA_PATH)) return {};
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}
