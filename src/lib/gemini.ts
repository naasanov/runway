import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export const gemini = genAI.getGenerativeModel({
  model: env.GEMINI_MODEL,
});
