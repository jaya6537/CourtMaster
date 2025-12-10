import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { db } from "./db";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getContextData = () => {
    const courts = db.getCourts().map(c => c.name).join(", ");
    const coaches = db.getCoaches().map(c => `${c.name} (${c.specialty})`).join(", ");
    return `Available Courts: ${courts}. Available Coaches: ${coaches}. Peak hours are 6PM-9PM. Weekends have a $5 surcharge.`;
}

export const createChatSession = (): Chat => {
  const context = getContextData();
  const SYSTEM_INSTRUCTION = `
    You are "CourtMaster AI", an assistant for a sports facility.
    Your job is to help users understand pricing, find available times, and choose equipment.
    
    Current Facility Context:
    ${context}

    Rules:
    - Keep answers short and sporty.
    - Explain pricing clearly (Base price + modifiers).
    - If asked about availability, explain that you can't check live database yet, but they should look at the calendar grid.
    - Encourage them to book a coach if they are beginners.
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

export const sendMessageStream = async (chat: Chat, message: string): Promise<AsyncIterable<GenerateContentResponse>> => {
  try {
    const responseStream = await chat.sendMessageStream({ message });
    return responseStream;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};
