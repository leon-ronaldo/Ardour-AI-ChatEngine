import { HumanCharacterProfile } from "./HumanProfile"
import Relationship from "./RelationShipModel"


export interface Incident {
    title: string,
    whatHappened: string,
    peopleInvolved?: Relationship[],
    timestamp: number | string | "NOT_SURE"
}

export interface MemoryModel {
    for?: string,  // almost the same
    name?: string, // almost the same

    age?: number,
    livingIn?: string,

    people?: Relationship[],
    incidents?: Incident[],

    characterProfile?: HumanCharacterProfile
}