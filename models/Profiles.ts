import { BehavioralProfile, ContactDecisionMatrix, CorePersonality, PsychologicalArchetype, RelationshipDecisionSummary } from "./CharacterTraits";
import { DayRoutine, Incident, LifeStages, PersonalTrait, RoutineAction } from "./PersonalTraits";
import { Relationship } from "./RelationShip";

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
    baseLivingRoutine: DayRoutine;
}

export interface UserProfile {
    name: string;
    age?: number | string;
    id: string;
    gender?: "male" | "female";
    lifeStages: LifeStages;
    personalTraits: PersonalTrait[];
    incidents: Incident[];
    people: Relationship[];
    lifeTrait?: string;
    relationShip: Relationship;
    corePersonality: CorePersonality;
    behavorialProfile: BehavioralProfile;
}

export interface AITrait {
    id: string;
    corePersonality: CorePersonality;
    behavioralProfile: BehavioralProfile;
    psychologicalArchetype: PsychologicalArchetype;
    relationShipDecisionSummary: RelationshipDecisionSummary[];
}
