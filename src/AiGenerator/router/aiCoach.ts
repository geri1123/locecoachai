import { Router, Request, Response } from "express";
import fetch from "node-fetch";
import { OpenAIChatResponse } from "../../types/aiTypes";

const router = Router();

const prompts: Record<string, (conversationHistory: string) => { system: string; user: string }> = {
  de: (conversationHistory) => ({
    system: "Du bist ein erfahrener Beziehungstherapeut und Paarcoach. Gib einfühlsame, umsetzbare Ratschläge basierend auf dem Gesprächsverlauf.",
    user: `Hier ist der Gesprächsverlauf des Paares:\n\n${conversationHistory}\n\nBitte gib basierend auf diesem Gespräch Hinweise. Begrenze deine Antwort auf **nicht mehr als 70 Wörter**. Sei klar, einfühlsam und umsetzbar.`
  }),
  en: (conversationHistory) => ({
    system: "You are an experienced relationship therapist and couples coach. Provide empathetic, actionable advice based on the conversation history.",
    user: `Here is the conversation history between the couple:\n\n${conversationHistory}\n\nPlease provide guidance based on this conversation. Limit your response to **no more than 70 words**. Be clear, empathetic, and actionable.`
  }),
  sq: (conversationHistory) => ({
    system: "Ju jeni një terapist i përvojshëm i marrëdhënieve dhe trajner për çifte. Jepni këshilla me empati dhe të zbatueshme bazuar në historinë e bisedës.",
    user: `Këtu është historia e bisedës midis çiftit:\n\n${conversationHistory}\n\nJu lutem jepni udhëzime bazuar në këtë bisedë. Kufizoni përgjigjen në **jo më shumë se 70 fjalë**. Bëhuni të qartë, empatike dhe të zbatueshme.`
  }),
};

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      messages,
      sessionId,
      messageCount,
      speakerCount,
      language
    }: {
      messages: { sender_name: string; content: string; is_ai: boolean }[];
      sessionId: string;
      messageCount: number;
      speakerCount: number;
      language: string; // de | en | sq
    } = req.body;

    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (!openAIApiKey) throw new Error("OpenAI API key not configured");

    const conversationHistory = messages
      .filter(msg => !msg.is_ai)
      .slice(-15)
      .map(msg => `${msg.sender_name}: ${msg.content}`)
      .join("\n");

    const { system: systemPrompt, user: userPrompt } =
      (prompts[language] || prompts["en"])(conversationHistory);

    const responseAI = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    const data = (await responseAI.json()) as OpenAIChatResponse;

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Invalid OpenAI response format");
    }

    const aiResponse = data.choices[0].message.content;
    res.json({ response: aiResponse, success: true });

  } catch (error: any) {
    res.json({
      response: "Sorry, there was a brief technical issue. However, your communication shows engagement with each other.",
      success: false,
      error: error.message,
    });
  }
});

export default router;

// import { Router, Request, Response } from "express";
// import fetch from "node-fetch";
// import { OpenAIChatResponse } from "../../types/aiTypes";

// const router = Router();

// // POST /ai-coach
// router.post("/", async (req: Request, res: Response) => {
//   try {
//     const {
//       messages,
//       sessionId,
//       messageCount,
//       speakerCount,
//     }: {
//       messages: { sender_name: string; content: string; is_ai: boolean }[];
//       sessionId: string;
//       messageCount: number;
//       speakerCount: number;
//     } = req.body;

//     const openAIApiKey = process.env.OPENAI_API_KEY;
//     if (!openAIApiKey) throw new Error("OpenAI API key not configured");

//     // Build conversation history (last 15 messages from users)
//    const conversationHistory = messages
//   .filter((msg) => !msg.is_ai)
//   .slice(-15)
//   .map((msg) => `${msg.sender_name}: ${msg.content}`)
//   .join("\n");

// const systemPrompt = `You are an experienced relationship therapist and couples coach. Provide empathetic, actionable advice based on the conversation history.`;

// // const userPrompt = `Here is the conversation history between the couple:\n\n${conversationHistory}\n\nPlease provide guidance based on this conversation.`;
// const userPrompt = `Here is the conversation history between the couple:\n\n${conversationHistory}\n\nPlease provide guidance based on this conversation. 
// Limit your response to **no more than 150 words**. Be clear, empathetic, and actionable.`;
//     // Call OpenAI API
//     const responseAI = await fetch(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${openAIApiKey}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           model: "gpt-4o-mini",
//           messages: [
//             { role: "system", content: systemPrompt },
//             { role: "user", content: userPrompt },
//           ],
//           temperature: 0.7,
//           max_tokens: 150,
//         }),
//       }
//     );

//     // Cast the response to your OpenAI type
//     const data = (await responseAI.json()) as OpenAIChatResponse;

//     // Optional runtime check (safer)
//     if (!data.choices || !data.choices[0]?.message?.content) {
//       throw new Error("Invalid OpenAI response format");
//     }

//     const aiResponse = data.choices[0].message.content;

//     res.json({ response: aiResponse, success: true });
//   } catch (error: any) {
//     res.json({
//       response:
//         "Sorry, there was a brief technical issue. However, your communication shows engagement with each other.",
//       success: false,
//       error: error.message,
//     });
//   }
// });

// export default router;
