import { Relationship } from "./RelationShip";

export interface Incident {
    id: string;
    incidentName: string;
    timestamp: number;
    description: string;
    peopleInvolved: Relationship[]
}

export type PersonalTraitImpact =
    | "VERY_IMPORTANT"
    | "IMPORTANT"
    | "NOT_IMPORTANT"
    | "NORMAL"

export interface PersonalTrait {
    id: string;
    name: string;
    impact: PersonalTraitImpact;
    description: string;
    category: string;
    reason?: string;
}

export interface Stage {
    incidents: string[];
    remarkablePeople: string[];
    storySummary: string[];
}

export interface LifeStages {
    childHood: Stage;
    teenAge: Stage;
    adultHood: Stage;
}

export interface RoutineAction {
    startTime: number | "NOT_SURE";
    endTime: number | "NOT_SURE";
    action: string;
    description: string;
    reason: string | "NO_SPECIFIC_REASON";
}

export interface DayRoutine {
    morning: RoutineAction[];
    noon: RoutineAction[];
    evening: RoutineAction[];
    night: RoutineAction[];
    lateNight: RoutineAction[];
}

export type ContextWeight = "HEAVIEST" | "HEAVIER" | "HEAVY" | "MODERATE" | "LIGHT";

export interface ContextState {
    activity: string;
    contextWeight: ContextWeight;
    timestamp: number;
    absenceTimeState?: AbsenceTimeState;
}

export interface AbsenceTimeState {
    startTimestamp: number;
    endTimestamp: number;
}
