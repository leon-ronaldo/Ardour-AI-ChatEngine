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

type Relationship = {
    category: RelationshipCategory;
    role: RelationshipRole;
    targetName?: string;
};

export default Relationship;