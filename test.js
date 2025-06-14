import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyDsqngE0DbHGXd5Cm9ypCVypvn9-SGc4RU" });


async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: "How does AI work?",
  });
  console.log(response.text);
}

await main();