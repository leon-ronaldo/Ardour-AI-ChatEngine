import { Chat, Emotion } from "../models/ChatModels";
import { IChatMessage } from "../models/ChatPool";
import { BigFiveTraits, CognitiveTraits, EmotionalTraits, HumanCharacterProfile, MoralTraits, SocialTraits } from "../models/HumanProfile";
import { Incident, MemoryModel } from "../models/MemoryModel";
import Relationship from "../models/RelationShipModel";
import getAIResponse from "../utils/gemini";
import { formatChatLog } from "../utils/tools";

export default class ChatHistoryAnalyser {

  async analyzeBigFive(messages: IChatMessage[], contactId: string): Promise<BigFiveTraits> {
    const prompt = `
      You're a psychology expert. Based on the following chat messages, rate the user's Big Five personality traits (between 0 and 1 for each):
      
      Chat log:
      ${formatChatLog(messages, contactId)}
      
      Return JSON in the following format:
      {
        "openness": 0.7,
        "conscientiousness": 0.5,
        "extraversion": 0.6,
        "agreeableness": 0.8,
        "neuroticism": 0.4
      }`;

    const response = await getAIResponse(prompt);
    return JSON.parse(response!);
  }

  async analyzeEmotionalTraits(messages: IChatMessage[], contactId: string): Promise<EmotionalTraits> {
    const prompt = `
      You are an emotional intelligence analyst. Given the chat history, rate the user's emotional traits on a scale from 0 to 1 (higher is more):
      
      Chat log:
      ${formatChatLog(messages, contactId)}
      
      Return JSON like this:
      {
        "empathy": 0.7,
        "humor": 0.6,
        "confidence": 0.8,
        "patience": 0.4,
        "resilience": 0.6,
        "courage": 0.5,
        "impulsiveness": 0.3
      }`;

    const response = await getAIResponse(prompt);
    return JSON.parse(response!);
  }

  async analyzeSocialTraits(messages: IChatMessage[], contactId: string): Promise<SocialTraits> {
    const prompt = `
      You're a social behavior analyst. Analyze the chat and return the user's social traits from 0 to 1:
      
      Chat log:
      ${formatChatLog(messages, contactId)}
      
      Return this JSON:
      {
        "altruism": 0.5,
        "cooperation": 0.6,
        "assertiveness": 0.4,
        "dominance": 0.2,
        "politeness": 0.9
      }`;

    const response = await getAIResponse(prompt);
    return JSON.parse(response!);
  }

  async analyzeMoralTraits(messages: IChatMessage[], contactId: string): Promise<MoralTraits> {
    const prompt = `
      You're a moral philosopher. Based on this chat, rate the user's moral characteristics (scale: 0 to 1):
      
      Chat log:
      ${formatChatLog(messages, contactId)}
      
      Return JSON like:
      {
        "integrity": 0.8,
        "fairness": 0.7,
        "loyalty": 0.9,
        "responsibility": 0.6
      }`;

    const response = await getAIResponse(prompt);
    return JSON.parse(response!);
  }

  async analyzeCognitiveTraits(messages: IChatMessage[], contactId: string): Promise<CognitiveTraits> {
    const prompt = `
      You are a cognitive scientist. Based on this chat log, rate the user's cognitive traits.
      
      Chat log:
      ${formatChatLog(messages, contactId)}
      
      Return JSON like:
      {
        "curiosity": 0.7,
        "creativity": 0.8,
        "learningRate": 0.6,
        "workingMemory": 0.5,
        "attentionSpan": 0.4,
        "decisionStyle": "analytical", // or "intuitive" or "balanced"
        "biasTendency": 0.2
      }`;

    const response = await getAIResponse(prompt);
    return JSON.parse(response!);
  }

  async analyzeAllTraits(messages: IChatMessage[], contactId: string): Promise<HumanCharacterProfile> {
    return {
      bigFive: await this.analyzeBigFive(messages, contactId),
      emotional: await this.analyzeEmotionalTraits(messages, contactId),
      social: await this.analyzeSocialTraits(messages, contactId),
      cognitive: await this.analyzeCognitiveTraits(messages, contactId),
      moral: await this.analyzeMoralTraits(messages, contactId)
    };
  }


  async selectRelevantMessagesForIncidentDetection(
    messages: IChatMessage[],
    selfId: string
  ): Promise<IChatMessage[]> {

    const formatted = messages.map((msg, index) => {
      const sender = msg.from === selfId ? "You" : "Them";
      return `[${index}] ${sender}: ${msg.message}`;
    }).join("\n");

    const prompt = `
      You are a chat analysis AI. Below is a chat log labeled with message indices.
      
      Your task: **Return the indices (like [12], [18], [25])** of **only the messages that are meaningful or likely to describe real-life events** (e.g. trips, fights, memorable stories, accidents).
      
      Return ONLY a **JSON array of numbers** (no extra text). Between 20–50 messages is ideal. If nothing is meaningful, return an empty array.
      
      Chat log:
      ${formatted}
      
      Response format:
      [3, 6, 9, 12]
      `;

    const aiResponse = await getAIResponse(prompt);
    if (!aiResponse) return [];

    try {
      const indexes = JSON.parse(aiResponse) as number[];

      const selected = indexes
        .filter(i => i >= 0 && i < messages.length)
        .map(i => messages[i]);

      return selected;
    } catch (err) {
      console.error("❌ Failed to parse relevant message indices:", err);
      return [];
    }
  }

  async analyzeIncidentsFromChat(
    messages: IChatMessage[],
    contactId: string,
    knownRelationships: Relationship[]
  ): Promise<{ incidents: Incident[], newPeople: Relationship[] }> {

    // Step 1: Pre-filter relevant messages
    const relevantMessages = await (this.selectRelevantMessagesForIncidentDetection?.call?.(this, messages, contactId) ?? messages);

    // Step 2: Ask AI for incidents with structured people involved
    const prompt = `
    You're a memory extraction AI designed to identify only **truly memorable life incidents** from chat logs — similar to how a human reflects on past events.

### 🚫 DO NOT extract:
- Random or unremarkable small-talk
- Casual updates like “I went to class”, “I had lunch”
- Meeting unknown strangers with no emotional/impactful significance

### ✅ Only extract an incident if:
- It was **emotionally meaningful**, **life-impacting**, **personally significant**, or **vivid enough to remember for years**
- It involved key relationships or life events (e.g., fights, reunions, surprises, losses, major decisions)
- It's a moment the user might tell someone else in the future

### 👥 People Involved:
Only include people **directly connected to the user**, like friends, family, known classmates, coworkers, etc.

🛑 DO NOT:
- Invent people (e.g., "stranger", "some men") unless they had a **clearly described impactful role**
- Add random background characters

### Output Format:
For each incident, return:
- title: short string
- whatHappened: short summary
- timestamp: number, "NOT_SURE", or vague string like "last week"
- remembrance: 0 (trivial) to 1 (deeply important)
- peopleInvolved: structured using:

{
  "category": "FRIENDSHIP",         // one of the categories
  "role": "CLOSE_FRIEND",           // one of the valid roles
  "targetName": "Neha"              // person name
}

🛑 Allowed categories and roles:

- FAMILY: 
  - PARENT, CHILD, SIBLING, GRANDPARENT, GRANDCHILD, UNCLE_AUNT, NIECE_NEPHEW, COUSIN, STEP_PARENT, STEP_SIBLING, IN_LAW, FOSTER_PARENT, GUARDIAN

- ROMANTIC: 
  - PARTNER, SPOUSE, FIANCE, CRUSH, EX_PARTNER, OPEN_RELATIONSHIP, SITUATIONSHIP

- FRIENDSHIP: 
  - BEST_FRIEND, CLOSE_FRIEND, CASUAL_FRIEND, CHILDHOOD_FRIEND, ONLINE_FRIEND, ACQUAINTANCE, FRENEMY

- PROFESSIONAL: 
  - MANAGER, EMPLOYEE, COLLEAGUE, MENTOR, MENTEE, BUSINESS_PARTNER, CLIENT, CONTRACTOR, COMPETITOR

- EDUCATIONAL: 
  - TEACHER, STUDENT, CLASSMATE, SCHOOLMATE, PRINCIPAL, COACH, ADVISOR, ADVISEE

- SOCIAL:
  - NEIGHBOR, COMMUNITY_MEMBER, VOLUNTEER, BENEFICIARY, CITIZEN, GOVERNMENT_OFFICIAL, ACTIVIST, FOLLOWER, LEADER

- SPIRITUAL:
  - GURU, DISCIPLE, PRIEST, CONGREGANT, BELIEVER, DEVOTEE, SPIRITUAL_GUIDE, SEEKER, GOD

- NONHUMAN:
  - PET, AI_ASSISTANT, ROBOT, VIRTUAL_AGENT, GAME_CHARACTER, TOOL_USER

Always use matching roles from above.

---

### ✨ Chat log:
${formatChatLog(relevantMessages, contactId)}

Return strict JSON only like this format (or \`[]\` if no valid incidents):

[
  {
    "title": "Trip to Goa",
    "whatHappened": "Went to Goa with college friends and got lost on the beach at night.",
    "timestamp": "Last December",
    "remembrance": 0.95,
    "peopleInvolved": [
      {
        "category": "FRIENDSHIP",
        "role": "CLOSE_FRIEND",
        "targetName": "Neha"
      }
    ]
  }
]
    `;

    const rawResponse = await getAIResponse(prompt);
    if (!rawResponse) return { incidents: [], newPeople: [] };

    let incidents: Incident[];
    try {
      incidents = JSON.parse(rawResponse);
      if (!Array.isArray(incidents)) return { incidents: [], newPeople: [] };
    } catch (err) {
      console.error("❌ Failed to parse incidents JSON:", err);
      return { incidents: [], newPeople: [] };
    }

    // Step 3: Deduplicate known vs new relationships
    const newPeople: Relationship[] = [];

    for (const incident of incidents) {
      const people = (incident.peopleInvolved ?? []) as Relationship[];

      const known: Relationship[] = [];
      for (const person of people) {
        const exists = knownRelationships.find(r =>
          r.targetName?.toLowerCase() === person.targetName?.toLowerCase()
        );
        if (exists) {
          known.push(exists);
        } else {
          newPeople.push(person);
          known.push(person); // still include it in the incident
        }
      }

      incident.peopleInvolved = known;
    }

    return { incidents, newPeople };
  }


}