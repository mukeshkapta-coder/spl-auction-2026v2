import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Player, Franchise } from "../types";

/**
 * Utility for exponential backoff retries.
 * Particularly useful for handling 429 Resource Exhausted errors.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(
  apiCall: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<any> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit && i < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, i);
        console.warn(`Gemini rate limit hit. Retrying in ${waitTime}ms (Attempt ${i + 1}/${maxRetries})...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const getScoutingReport = async (player: Player, franchises: Franchise[]): Promise<string> => {
  return callGeminiWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';

    const franchiseContext = franchises.map(f => `${f.name} (Budget: ${f.budget}, Squad size: ${f.roster.length})`).join(', ');
    
    const prompt = `
      Generate a high-impact scouting report for ${player.name} (${player.skill}) for the IPL 2026 auction.
      Rating: ${player.rating}/100.
      Available Budget Data: ${franchiseContext}.
      Recent Stats: ${JSON.stringify(player.stats || "Limited data")}.
      
      Provide exactly 2 sentences focusing on:
      1. Tactical value (e.g., finisher, powerplay bowler).
      2. Which specific franchise from the list should bid for him.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });
    return response.text || "Report unavailable.";
  }).catch(error => {
    console.error("Scouting Error:", error);
    return "The scouting engine is currently overwhelmed. Rely on your tactical instinct for this pick.";
  });
};

export const fetchPlayersFromWeb = async (): Promise<Player[]> => {
  return callGeminiWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';
    
    const prompt = `
      URGENT: Scrape the official iplt20.com website for the Season 2026 squad details.
      
      USE THE FOLLOWING TARGET LINKS:
      - https://www.iplt20.com/teams/sunrisers-hyderabad
      - https://www.iplt20.com/teams/mumbai-indians
      - https://www.iplt20.com/teams/chennai-super-kings
      - https://www.iplt20.com/teams/royal-challengers-bengaluru
      - https://www.iplt20.com/teams/kolkata-knight-riders
      - https://www.iplt20.com/teams/delhi-capitals
      - https://www.iplt20.com/teams/rajasthan-royals
      - https://www.iplt20.com/teams/lucknow-super-giants
      - https://www.iplt20.com/teams/gujarat-titans
      - https://www.iplt20.com/teams/punjab-kings

      FOR EACH TEAM:
      Extract the Player Name, their actual IPL Team Name (e.g., "Mumbai Indians", "CSK", "Sunrisers Hyderabad"), and their Skill (e.g., "Batter", "Bowler", "All-Rounder", "WK-Batter").
      
      MANDATORY MAPPINGS:
      - Set EVERY player's basePrice to exactly 50.
      - Set isSold to false for all.
      - Include historical stats if available.
      - Assign a performance rating (0-100).

      Output as a JSON array of objects.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              skill: { type: Type.STRING },
              basePrice: { type: Type.NUMBER },
              country: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              isSold: { type: Type.BOOLEAN },
              originalTeam: { type: Type.STRING },
              stats: {
                type: Type.OBJECT,
                properties: {
                  matches: { type: Type.NUMBER },
                  runs: { type: Type.NUMBER },
                  wickets: { type: Type.NUMBER },
                  strikeRate: { type: Type.NUMBER },
                  economy: { type: Type.NUMBER }
                },
                required: ["matches"]
              }
            },
            required: ["id", "name", "skill", "basePrice", "country", "rating", "isSold", "originalTeam"]
          }
        }
      }
    });

    const players = JSON.parse(response.text || "[]");
    return players.map((p: any, index: number) => ({
      ...p,
      id: p.id || `p-2026-${index}`,
      basePrice: 50,
      isSold: false,
      points: 0,
      performanceHistory: []
    }));
  });
};

export const processScorecard = async (url: string, playersInDb: string[]): Promise<{ playerName: string, points: number, isPOTM: boolean, breakdown: string }[]> => {
  return callGeminiWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';
    
    const prompt = `
      Analyze the cricket scorecard at this URL: ${url}
      
      1. Identify "Player of the Match" (POTM).
      2. Analyze players ONLY from this list: ${playersInDb.join(', ')}.
      
      STRICT SCORING ALGORITHM:
      Batting:
      - 1 pt per run.
      - Bonus for Four: +2 pts (6 Total).
      - Bonus for Six: +4 pts (10 Total).
      
      Bowling:
      - 25 pts per Wicket.
      - Bonus for 3/5/6 Wickets (+25, +50, +75).
      
      Fielding & WK:
      - Catch: 10 pts.
      - Stumping: 10 pts.
      - WK Milestones (+25 for 3, +50 for 5 dismissals).
      
      Multiplier:
      - POTM: Total points calculated above are DOUBLED (x2).
      
      Output JSON array: [{"playerName": "String", "points": Number, "isPOTM": Boolean, "breakdown": "String"}].
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              playerName: { type: Type.STRING },
              points: { type: Type.NUMBER },
              isPOTM: { type: Type.BOOLEAN },
              breakdown: { type: Type.STRING }
            },
            required: ["playerName", "points", "isPOTM", "breakdown"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};
