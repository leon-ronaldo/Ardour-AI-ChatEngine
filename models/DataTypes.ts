import { AIProfile } from "./Profiles";

export type RelationshipCategory =
    | 'FAMILY'
    | 'ROMANTIC'
    | 'FRIENDSHIP'
    | 'PROFESSIONAL'
    | 'EDUCATIONAL'
    | 'SOCIAL'
    | 'SPIRITUAL'
    | 'NONHUMAN'
    | 'SELF';


// 1. Family Relationships
export type FamilyRelationship =
    | 'PARENT'
    | 'CHILD'
    | 'SIBLING'
    | 'GRANDPARENT'
    | 'GRANDCHILD'
    | 'UNCLE_AUNT'
    | 'NIECE_NEPHEW'
    | 'COUSIN'
    | 'STEP_PARENT'
    | 'STEP_SIBLING'
    | 'IN_LAW'
    | 'FOSTER_PARENT'
    | 'GUARDIAN';

// 2. Romantic Relationships
export type RomanticRelationship =
    | 'PARTNER'
    | 'SPOUSE'
    | 'FIANCE'
    | 'CRUSH'
    | 'EX_PARTNER'
    | 'OPEN_RELATIONSHIP'
    | 'SITUATIONSHIP';

// 3. Friendship Relationships
export type FriendshipRelationship =
    | 'BEST_FRIEND'
    | 'CLOSE_FRIEND'
    | 'CASUAL_FRIEND'
    | 'CHILDHOOD_FRIEND'
    | 'ONLINE_FRIEND'
    | 'ACQUAINTANCE'
    | 'FRENEMY';

// 4. Professional Relationships
export type ProfessionalRelationship =
    | 'MANAGER'
    | 'EMPLOYEE'
    | 'COLLEAGUE'
    | 'MENTOR'
    | 'MENTEE'
    | 'BUSINESS_PARTNER'
    | 'CLIENT'
    | 'CONTRACTOR'
    | 'COMPETITOR';

// 5. Educational Relationships
export type EducationalRelationship =
    | 'TEACHER'
    | 'STUDENT'
    | 'CLASSMATE'
    | 'SCHOOLMATE'
    | 'PRINCIPAL'
    | 'COACH'
    | 'ADVISOR'
    | 'ADVISEE';

// 6. Social Relationships
export type SocialRelationship =
    | 'NEIGHBOR'
    | 'COMMUNITY_MEMBER'
    | 'VOLUNTEER'
    | 'BENEFICIARY'
    | 'CITIZEN'
    | 'GOVERNMENT_OFFICIAL'
    | 'ACTIVIST'
    | 'FOLLOWER'
    | 'LEADER';

// 7. Spiritual Relationships
export type SpiritualRelationship =
    | 'GURU'
    | 'DISCIPLE'
    | 'PRIEST'
    | 'CONGREGANT'
    | 'BELIEVER'
    | 'DEVOTEE'
    | 'SPIRITUAL_GUIDE'
    | 'SEEKER'
    | 'GOD';

// 8. Non-Human Relationships
export type NonHumanRelationship =
    | 'PET'
    | 'AI_ASSISTANT'
    | 'ROBOT'
    | 'VIRTUAL_AGENT'
    | 'GAME_CHARACTER'
    | 'TOOL_USER';

export type RelationshipRole =
    | FamilyRelationship
    | RomanticRelationship
    | FriendshipRelationship
    | ProfessionalRelationship
    | EducationalRelationship
    | SocialRelationship
    | SpiritualRelationship
    | NonHumanRelationship;

export type RelationShipClosenessTrait =
    | "VERY_CLOSE"
    | "CLOSE"
    | "MODERATE"
    | "BASE"
    | "DOESNT_LIKE"
    | "HATE"
    | "UNKNOWN"


export type Relationship = {
    id: string;
    name: string;
    category: RelationshipCategory;
    role: RelationshipRole;
    closeness: RelationShipClosenessTrait;
    knownSince?: number
}

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