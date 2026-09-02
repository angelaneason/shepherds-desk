import { GoogleGenerativeAI } from '@google/generative-ai';

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // We use the 2.0 flash model as requested
  return genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
}
