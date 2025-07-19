import { Relationship } from "./RelationShip";

export interface CorePersonality {
    openness: number; // 0–1
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;

    empathy: number; // 0–1
    emotionalDepth: number; // 0–1
    introversion: boolean;

    personalityKeywords: string[]; // ["resilient", "empathetic", "reflective"]
    mbtiType?: string; // e.g., "INFJ"
    enneagramType?: string; // optional
}

export interface BehavioralProfile {
    conflictAvoidance: number; // 0–1
    forgiveness: number;       // 0–1
    initiativeInTexting: number; // Tendency to reach out first
    responseDelayTolerance: number; // Wait before feeling ignored (in hours)
    attachmentStyle?: 'SECURE' | 'ANXIOUS' | 'AVOIDANT' | 'FEARFUL';

    textingRules: {
        replyToAll?: boolean;
        neverTextFirstRoles?: string[]; // e.g., ["EX_PARTNER"]
        alwaysTextFirstRoles?: string[]; // e.g., ["PARENT", "BEST_FRIEND"]
    };
}

export interface RelationshipDecisionSummary {
    person: Relationship;

    emotionalCloseness: number; // 0–1
    trustLevel: number;         // 0–1
    contactInitiationBias: number; // -1 = they always initiate, 1 = I always initiate
    messageRecencyScore: number; // Based on timestamp
    responsivenessScore: number; // Based on how often they reply
    importanceToSelf: number;    // 0–1
    importanceToThem?: number;   // Optional: predicted

    historicalBondScore: number; // Based on incidents & years known

    avoidContact?: boolean;      // Optional manual override (e.g., ex, enemy)
    lastInteractionTimestamp: number;
}

export interface PsychologicalArchetype {
    label: string; // e.g., "Wounded Healer"
    description: string;
    coreBeliefs: string[];
    behaviorPatterns: string[];
}

export interface ContactDecisionMatrix {
    contactId: string;

    scoreToReachOut: number; // final score after weighing all factors
    scoreToWait: number;
    scoreToIgnore: number;

    recommendedAction: 'TEXT_FIRST' | 'WAIT' | 'IGNORE';

    waitToMessageTill?: number;
}
