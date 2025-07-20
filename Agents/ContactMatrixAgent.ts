import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BehavioralProfile, ContactDecisionMatrix, CorePersonality, RelationshipDecisionSummary } from "../models/CharacterTraits";
import { ContactWithPreview } from "../models/ChatPool";
import { ContextState, DayRoutine } from "../models/PersonalTraits";
import { AIProfile } from "../models/Profiles";
import { safeParseJSON } from "../utils/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export class ContactMatrixAgent {

    llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash", // or "gemini-1.5-pro", etc.
        apiKey: "AIzaSyBMlGsH4vA9gcEimwnOyMTAFcPZ33J3akI",
        temperature: 0.7,
    });

    getTimeOfDay(hour: number): keyof DayRoutine {
        if (hour >= 5 && hour < 12) return "morning";
        if (hour >= 12 && hour < 15) return "noon";
        if (hour >= 15 && hour < 19) return "evening";
        if (hour >= 19 && hour < 23) return "night";
        return "lateNight";
    }

    async constructLivingState(
        aiProfile: AIProfile,
        previousLivingStates: ContextState[] = []
    ): Promise<ContextState> {
        const now = new Date();
        const hour = now.getHours();

        const dayRoutine = aiProfile.baseLivingRoutine;

        const timeOfDay = this.getTimeOfDay(hour);
        const currentRoutine = dayRoutine[timeOfDay];

        const systemPrompt = new SystemMessage(
            `You are simulating the moment-to-moment consciousness of a realistic AI persona with nuanced, human-like behavior.

Based on:
- the current phase of the day,
- their personal routine,
- and past context history,

...generate what the AI is most likely doing *right now* in a believable, vivid manner.

Output must strictly follow the "ContextState" structure:
{
    activity: string, // A short natural-language description of the action performed or planned
    contextWeight: "HEAVIEST" | "HEAVIER" | "HEAVY" | "MODERATE" | "LIGHT", // Reflects the level of cognitive/emotional/contextual weight
    timestamp: number, // Unix epoch in milliseconds when the activity is (or was) completed
    AbsenceTimeState?: { // Present only if contextWeight is HEAVIER or HEAVIEST (and maybe for HEAVY); always null/absent for MODERATE or LIGHT
        startTimestamp: number, // Unix epoch in milliseconds for start of offline/unavailable period
        endTimestamp: number    // Unix epoch in milliseconds for end of offline/unavailable period
    }
}
  

Guidelines:
- Use the routine action as a **guide**, not a script. The actual activity should feel *natural*, possibly adjacent or tangential.
- Consider environmental factors: Is the AI relaxed, multitasking, in bed, near others, or using a device?
- Include internal states like “mind-wandering,” “scrolling messages aimlessly,” or “deep in thought” if appropriate.
- If the action is mentally/socially intensive (e.g., focused journaling, argument, coding), assign a HEAVIER weight.
- If it is light, passive (e.g., casual browsing, daydreaming), assign LIGHT or MODERATE.

Act as this specific AI persona, with its unique habits, interests, and mindset—not a generic human. Prioritize realism over structure.

Example:
- If the routine says "Reflection and message review", a realistic activity might be:
  "Mindlessly scrolling through old conversations while lying in bed, occasionally smiling at past moments."

The final activity string must sound natural and human-like.`
        );

        const humanPrompt = new HumanMessage(
            `AI Profile:
      ${JSON.stringify({
                name: aiProfile.name,
                age: aiProfile.age,
                gender: aiProfile.gender,
                lifeTrait: aiProfile.lifeTrait
            }, null, 2)}
      
      Current Time: ${hour}:00
      Time of Day: ${timeOfDay}
      
      Previous Contexts:
      ${JSON.stringify(previousLivingStates.slice(-3), null, 2)}
      
      Current Day's Routine for "${timeOfDay}":
      ${JSON.stringify(currentRoutine, null, 2)}
      
      Choose the best matching routine activity and convert to ContextState format.`
        );

        const response = await this.llm.invoke([systemPrompt, humanPrompt]);

        try {
            const context: ContextState = safeParseJSON(response.content.toString());
            return context;
        } catch (err) {
            throw new Error("LLM response could not be parsed: " + response.content);
        }
    }

    async constructContactMatrix(
        aiProfile: AIProfile,
        currentLivingContext: ContextState,
        recentMessages: ContactWithPreview[],
        behavioralProfile: BehavioralProfile,
        corePersonality: CorePersonality,
        relationShipDecisionSummary: RelationshipDecisionSummary[]
    ): Promise<ContactDecisionMatrix[]> {
        // 1. Filter out irrelevant or blocked relationships
        const filteredSummaries = relationShipDecisionSummary.filter((rel) => {
            if (rel.person.type === "CONTACT") {
                const avoid = rel.avoidContact === true;
                const isInNeverTextFirst = behavioralProfile.textingRules.neverTextFirstRoles?.includes(rel.person.role);
                const isInactive = rel.messageRecencyScore < 0.1 && rel.responsivenessScore < 0.1;
                return !avoid && !isInNeverTextFirst && !isInactive;
            }
        });

        const systemPrompt = new SystemMessage(
            `You are a psychological social decision-making AI that simulates how an emotionally aware human chooses who to reach out to.
      
      Your task is to return a **Contact Decision Matrix** for the given AI persona, based on:
      - Their current living context
      - Core personality traits
      - Texting behavioral rules
      - Past relationship strength and emotional bonds
      
      Output a JSON array of objects (one per contact), using this structure:
      
      {
        contactId: string,
        scoreToReachOut: number,       // 0–1
        scoreToWait: number,           // 0–1
        scoreToIgnore: number,         // 0–1
        recommendedAction: "TEXT_FIRST" | "WAIT" | "IGNORE",
        waitToMessageTill?: number,    // if recommendedAction is WAIT, then return date number (milliseconds still epoch) of the time to wait for them to reply
      }
      
      Only include contacts that are emotionally relevant or meaningful to the HUMAN *right now*.`
        );

        const humanPrompt = new HumanMessage(
            `AI Profile:
      ${JSON.stringify({
                name: aiProfile.name,
                age: aiProfile.age,
                gender: aiProfile.gender,
                lifeTrait: aiProfile.lifeTrait
            }, null, 2)}
      
      Current Context:
      ${JSON.stringify(currentLivingContext, null, 2)}
      
      Core Personality:
      ${JSON.stringify(corePersonality, null, 2)}
      
      Behavioral Profile:
      ${JSON.stringify(behavioralProfile, null, 2)}
      
      Recent Contacts with messages:
      ${JSON.stringify(recentMessages, null, 2)}
      
      Relationship Decision Summaries:
      ${JSON.stringify(filteredSummaries, null, 2)}
      
      
      Consider both recent contacts and the decision summaries.
      Consider all the characteristics of the profile (and simulate human like approach to contacts)
      Generate a Contact Decision Matrix now.`
        );

        const response = await this.llm.invoke([systemPrompt, humanPrompt]);

        try {
            const matrix: ContactDecisionMatrix[] = safeParseJSON(response.content.toString());
            return matrix;
        } catch (err) {
            throw new Error("LLM response could not be parsed:\n" + response.content);
        }
    }
}