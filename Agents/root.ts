import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConversationChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
import readline from "readline";
import { PromptTemplate } from "@langchain/core/prompts";
import { Tool } from "langchain/tools";

export const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash", // or "gemini-1.5-pro", etc.
    apiKey: "AIzaSyBMlGsH4vA9gcEimwnOyMTAFcPZ33J3akI",
    temperature: 0.7,
});

// const memory = new BufferMemory();

// // 3. Setup conversational chain
// const chain = new ConversationChain({
//     llm,
//     memory: memory,
//     prompt: PromptTemplate.fromTemplate(`
//     You are a human, trying to speak to a new person.
//     Remember to speak like a human — natural tone, no robotic or overly long replies.
//     Keep context in mind.
    
//     Conversation history:
//     {history}
    
//     New message:
//     Human: {input}
//     AI:
//     `)
// });

// // 4. CLI interface
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
// });

// console.log("🧠 Gemini Bot is ready! (type 'exit' to quit)");

// function ask() {
//     rl.question("You: ", async (input) => {
//         if (input.toLowerCase() === "exit") {
//             rl.close();
//             return;
//         }

//         try {
//             const res = await chain.call({ input });
//             console.log("Bot:", res.response);
//         } catch (err) {
//             console.error("❌ Error:", err);
//         }

//         ask();
//     });
// }

// ask();

