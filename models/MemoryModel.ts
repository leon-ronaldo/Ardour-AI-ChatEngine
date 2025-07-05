import { IPassProfile } from "../Agents/Master"
import { HumanCharacterProfile } from "./HumanProfile"
import Relationship from "./RelationShipModel"

export interface Incident {
    title: string,
    whatHappened: string,
    peopleInvolved?: Relationship[],
    timestamp: number | string | "NOT_SURE",
    remembrance: number // 0 to 1
}

export interface MemoryModel {
    profile: IPassProfile,
    livingIn?: string,

    knowThem?: boolean,

    people?: Relationship[],
    incidents?: Incident[],

    characterProfile?: HumanCharacterProfile
}