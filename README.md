# Ardour-AI-ChatEngine

## The AI chat engine for Ardour AI

# Goal  

Create an intelligent chatting system mimicking human characteristics.

---

## 🧠 Agents Used

1. **Chat History Analyser**  
2. **Dialogue Generator**  
3. **Dialogue Redefiner**  
4. **Master**

---

## 1. Chat History Analyser

- Maintains a history of chats  
- Summarizes chats periodically  
- Summary is fed to the next agent for dialogue generation

---

## 2. Dialogue Generator

Generates dialogue based on:

- Previous summary  
- Characteristic parameters (e.g., humor, knowledge)  
- Current situation  
- Chat history and relationship knowledge

---

## 3. Dialogue Redefiner

- Validates if the dialogue is appropriate  
  - (Should not sound like an AI response: e.g., *"I cannot do that!"*)  
- Refines dialogue using linguistic parameters:
  - Slang  
  - Age  
  - Behavior

---

## 4. Master

- Orchestrates the workflow of the above three agents
