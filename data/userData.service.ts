import * as fs from 'fs';
import * as path from 'path';
import { AIProfile, AITrait } from '../models/Profiles';
import { ChatDataSummary } from '../models/ChatModels';
import { date, object } from 'zod';

const USER_DATA_PATH = path.join(__dirname, 'users.json');
const USER_TRAITS_DATA_PATH = path.join(__dirname, 'userTraits.json');
const USER_SUMMARY_DATA_PATH = path.join(__dirname, 'userChatSummary.json');


export function saveProfile(data: AIProfile) {
    const allProfiles = loadAllProfiles();
    allProfiles[data.id] = data;

    fs.writeFileSync(USER_DATA_PATH, JSON.stringify(allProfiles, null, 2));
    console.log(`✅ [saveProfile] Saved profile for: ${data.name} (ID: ${data.id})`);
}

export function loadProfile(id: string): AIProfile | undefined {
    if (!fs.existsSync(USER_DATA_PATH)) {
        console.warn(`⚠️ [loadProfile] No profile storage found at: ${USER_DATA_PATH}`);
        return;
    }

    const raw = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const profiles = JSON.parse(raw);

    const found = profiles[id];
    if (found) {
        console.log(`📦 [loadProfile] Loaded profile for: ${found.name} (ID: ${id})`);
    } else {
        console.warn(`❓ [loadProfile] No profile found with ID: ${id}`);
    }

    return found;
}

export function loadAllProfiles(): { [id: string]: AIProfile } {
    if (!fs.existsSync(USER_DATA_PATH)) {
        console.warn(`⚠️ [loadAllProfiles] No profile file found. Returning empty set.`);
        return {};
    }

    const raw = fs.readFileSync(USER_DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    const count = Object.keys(parsed).length;
    console.log(`📂 [loadAllProfiles] Loaded ${count} profile(s) from disk.`);

    return parsed;
}

// character traits helper

export function saveTrait(data: AITrait) {
    let allProfiles = loadAllTraits()
    allProfiles[data.id] = data;
    fs.writeFileSync(USER_TRAITS_DATA_PATH, JSON.stringify(data, null, 2));
    console.log('✅ Data saved.');
}

export function loadTrait(id: string): AITrait | undefined {
    if (!fs.existsSync(USER_TRAITS_DATA_PATH)) return;
    const raw = fs.readFileSync(USER_TRAITS_DATA_PATH, 'utf-8');
    return (JSON.parse(raw))[id];
}

export function loadAllTraits(): { [id: string]: AITrait } {
    if (!fs.existsSync(USER_TRAITS_DATA_PATH)) return {};
    const raw = fs.readFileSync(USER_TRAITS_DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}

// character chat summary helper

export function addSummary(
    summary: ChatDataSummary,
    agentId: string,
    contactId: string,
    date: string
) {
    // Load all summary data
    const allData: {
        [agentId: string]: { [contactId: string]: { [date: string]: ChatDataSummary[] } };
    } = fs.existsSync(USER_SUMMARY_DATA_PATH)
            ? JSON.parse(fs.readFileSync(USER_SUMMARY_DATA_PATH, 'utf-8'))
            : {};

    // Ensure nested structure exists
    if (!allData[agentId]) allData[agentId] = {};
    if (!allData[agentId][contactId]) allData[agentId][contactId] = {};
    if (!allData[agentId][contactId][date]) allData[agentId][contactId][date] = [];

    // Add the summary
    allData[agentId][contactId][date].push(summary);

    // Save to file
    fs.writeFileSync(USER_SUMMARY_DATA_PATH, JSON.stringify(allData, null, 2));
    console.log('✅ Summary saved.');
}

export function loadSummaryForDay(
    agentId: string,
    contactId: string,
    date: string
): ChatDataSummary[] | undefined {
    return loadAllSummaryForContact(agentId, contactId)[date];
}

export function loadSummaryForDays(
    agentId: string,
    contactId: string,
    dates: string[]
): { [date: string]: ChatDataSummary[] } | undefined {
    const allSummaries = loadAllSummaryForContact(agentId, contactId);
    if (!allSummaries) return undefined;

    const filteredSummaries = Object.fromEntries(
        Object.entries(allSummaries).filter(([day]) => dates.includes(day))
    );

    return filteredSummaries;
}



export function loadAllSummaryForContact(
    agentId: string,
    contactId: string
): { [date: string]: ChatDataSummary[] } {
    return loadAllSummary()[agentId]?.[contactId] ?? {};
}


export function loadAllSummary(): {
    [agentId: string]: { [contactId: string]: { [date: string]: ChatDataSummary[] } };
} {
    if (!fs.existsSync(USER_SUMMARY_DATA_PATH)) return {};
    const raw = fs.readFileSync(USER_SUMMARY_DATA_PATH, 'utf-8');
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('❌ Failed to parse summary file:', e);
        return {};
    }
}
