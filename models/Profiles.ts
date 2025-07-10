import { Incident, LifeStages, PersonalTrait, Relationship } from "./DataTypes";

export interface AIProfile {
    name: string;
    email: string;
    password: string;
    profileImage: string;
    accessToken: string;
    refreshToken: string;
    contacts: { [id: string]: UserProfile };
    age: number | string;
    gender: "male" | "female";
    id: string;
    lifeStages: LifeStages;
    personalTraits: PersonalTrait[];
    incidents: Incident[];
    people: Relationship[];
    lifeTrait: string;
}

export interface UserProfile {
    name: string;
    age?: number | string;
    id: string;
    gender?: "male" | "female";
    lifeStages?: LifeStages;
    personalTraits?: PersonalTrait[];
    incidents?: Incident[];
    people?: Relationship[];
    lifeTrait?: string;
    relationShip?: Relationship;
}