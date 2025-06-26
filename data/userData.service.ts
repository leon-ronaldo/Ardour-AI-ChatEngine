import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = path.join(__dirname, 'users.json');

export type UserCreds = {
    email: string,
    password: string,
    userId?: string,
    profileImage?: string,
    accessToken?: string,
    refreshToken?: string,
};

export function saveData(data: UserCreds[]) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log('✅ Data saved.');
}

export function loadData(): UserCreds[] {
    if (!fs.existsSync(DATA_PATH)) return [];
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}
