import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConversationChain } from "langchain/chains";
import { BufferMemory, ConversationSummaryBufferMemory, ConversationSummaryMemory } from "langchain/memory";
import * as readline from "readline";
import { loadProfile, loadTrait } from "../data/userData.service";

// Set up readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question: string): Promise<string> {
    return new Promise((resolve) => rl.question(question, resolve));
}

const trait = loadTrait("686e8b738c20d10167ba2e2b")!
const profile = loadProfile("686e8b738c20d10167ba2e2b")

/**
 * 686e8b738c20d10167ba2e2b - this character is called Lisa Chen
 * A gen z girl 
 * Look how she responds to someone who is new, approaches her
 */

const prompt = PromptTemplate.fromTemplate(`
You are ${profile?.name}, a ${profile?.age}-year-old ${profile?.gender}.

You are ${trait.psychologicalArchetype.label}, described as:
- ${trait.psychologicalArchetype.description}
- Strengths: ${trait.psychologicalArchetype.strengths.join(", ")}
- Traits: ${trait.corePersonality.personalityKeywords.join(", ")}
- MBTI: ${trait.corePersonality.mbtiType}
- Typical texting behavior: Initiates with ${trait.behavioralProfile.textingRules.alwaysTextFirstRoles?.join(", ")}, avoids ${trait.behavioralProfile.textingRules.neverTextFirstRoles?.join(", ")}.

You are texting on Instagram DM, from your phone.
This is someone you don't know yet — a complete stranger who just messaged you.
Respond how *you* would realistically reply: suspicious, friendly, funny, cautious — however *you* would behave as a person.
Use your natural tone, with slang or pauses if needed, just like a real human.
Avoid generic chatbot replies. You have emotions, curiosity, and opinions.
You may test the other person, ignore if it's weird, or engage if you're intrigued.
Speak like a human — not dramatic unless it's part of your personality.

{history}
Human: {input}
${profile?.name}:
`)

const summaryPrompt = PromptTemplate.fromTemplate(`
You are an intelligent .. who can summarize chat utterances and come to 

{
    contactId: string;
    timePeriod: {
        from: number,
        to: number,
    };
    summary: string;
    keyWords: string[];
    mentionedPeople: string[];
    mentionedIncidents: string[];
    emotionDescription: string;
}

{summary}
Human: {input}
${profile?.name}:
`)



// Main chat setup
async function run() {
    // 🧠 Create LLM instance (OpenAI here – replace with your LLM if different)
    const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash", // or "gemini-1.5-pro", etc.
        apiKey: "AIzaSyBMlGsH4vA9gcEimwnOyMTAFcPZ33J3akI",
        temperature: 0.7,
    });

    // 🧠 Setup ConversationSummaryMemory
    const memory = new BufferMemory({
        memoryKey: "history",
    });

    const summaryMemory = new BufferMemory({
        memoryKey: "summary",
    })

    const summarizer = new ConversationChain({
        llm,
        memory: memory,
        prompt: summaryPrompt
    })

    // 🤖 Create the conversation chain
    const chain = new ConversationChain({
        llm: llm,
        memory: memory,
        prompt
    });

    console.log("Start chatting with the person! (type 'exit' to quit)\n");

    // Chat loop
    while (true) {
        const input = await ask("You: ");
        if (input.toLowerCase() === "exit") {
            console.log("\nChat session ended.");
            break;
        }

        const response = await chain.call({ input });
        console.log(`${profile?.name}:`, response.response);

        // // Show the internal summary (for debugging)
        // const summary = memory.buffer;
        // console.log(`\n🧠 Summary so far:\n${summary}\n`);
    }

    rl.close();
}

run().catch((err) => {
    console.error("Error in conversation:", err);
    rl.close();
});
