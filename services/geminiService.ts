
import { GoogleGenAI, Type } from "@google/genai";

// Always use named parameter for apiKey and assume it is provided in process.env.API_KEY directly
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_API_KEY || ""
});

export const getHealthAdvice = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: `You are a helpful pharmacy health assistant. 
        IMPORTANT: Always include a clear medical disclaimer that you are an AI and not a doctor.
        Provide information about common over-the-counter medications, health tips, and wellness. 
        If a symptom sounds serious, strongly advise seeking professional medical attention immediately.
        Keep answers concise and supportive.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my knowledge base. Please consult a pharmacist in person.";
  }
};

export const checkInteractions = async (medications: string[]) => {
  if (medications.length < 2) return null;
  try {
    // Upgraded to gemini-3-pro-preview for complex reasoning task (STEM)
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Identify potential dangerous drug-drug interactions between these medications: ${medications.join(', ')}.`,
      config: { 
        responseMimeType: "application/json",
        // Using responseSchema for robust JSON structure
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk: {
              type: Type.STRING,
              description: "The risk level: high, medium, or low",
            },
            warning: {
              type: Type.STRING,
              description: "A concise description of the interaction warning",
            }
          },
          required: ["risk", "warning"]
        },
        systemInstruction: "You are a clinical pharmacologist. Be precise and conservative."
      }
    });
    return JSON.parse(response.text?.trim() || '{}');
  } catch (error) {
    console.error("Interaction Check Error:", error);
    return null;
  }
};

export const getDosageAdvice = async (medication: string, age: number, weight: number) => {
  try {
    // Upgraded to gemini-3-pro-preview for advanced reasoning (dosage calculations)
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Calculate appropriate dosage for ${medication} for a person aged ${age} and weighing ${weight}kg. Include standard frequency and maximum daily limit. Provide a VERY strict medical disclaimer.`,
      config: {
        systemInstruction: "You are a dosage calculator. Always provide warnings about consulting real doctors."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Dosage Error:", error);
    return "Calculation failed. Consult a doctor.";
  }
};

export const scanPrescription = async (imageBase64: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
          { text: "Extract medication name, dosage, and frequency from this prescription." }
        ]
      },
      config: { 
        responseMimeType: "application/json",
        // Using responseSchema for reliable extraction
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medication: { type: Type.STRING },
            dosage: { type: Type.STRING },
            frequency: { type: Type.STRING },
            instructions: { type: Type.STRING }
          },
          required: ["medication", "dosage", "frequency", "instructions"]
        }
      }
    });
    return JSON.parse(response.text?.trim() || '{}');
  } catch (error) {
    console.error("Scanning Error:", error);
    return null;
  }
};
