
import { Router, Request, Response } from "express";
import fetch from "node-fetch";
import { OpenAIChatResponse } from "../../types/aiTypes";

const router = Router();

// Funksion për të gjeneruar variety në përgjigje
const generateContextualPrompt = (
  conversationHistory: string,
  messageCount: number,
  speakerCount: number,
  language: string
) => {
  const prompts: Record<string, any> = {
    de: {
      system: `Du bist ein erfahrener Paartherapeut mit über 15 Jahren Praxis. 
      Du analysierst Kommunikationsmuster, erkennst emotionale Bedürfnisse und gibst konkrete, 
      individuelle Ratschläge. Vermeide generische Aussagen. Beziehe dich direkt auf das Gesagte.
      Variiere deinen Stil: Mal fokussierst du auf Emotionen, mal auf Kommunikationstechniken, 
      mal auf praktische Lösungen.`,
      
      userTemplates: [
        `Gesprächsverlauf (${messageCount} Nachrichten):\n${conversationHistory}\n\n
        Identifiziere das Kernproblem in diesem spezifischen Austausch. Was wird hier wirklich kommuniziert 
        (auch zwischen den Zeilen)? Gib eine konkrete Technik oder Perspektive, die genau auf diese 
        Situation passt. Max. 70 Wörter.`,
        
        `Analyse dieser ${messageCount} Nachrichten:\n${conversationHistory}\n\n
        Was übersieht dieses Paar gerade? Welches Bedürfnis wird nicht ausgesprochen? 
        Gib einen spezifischen, umsetzbaren Impuls für die nächsten 10 Minuten ihres Gesprächs. 
        Max. 70 Wörter.`,
        
        `Paar-Dialog:\n${conversationHistory}\n\n
        Erkenne den emotionalen Subtext. Was fühlt jede Person wirklich? 
        Schlage eine konkrete Kommunikationsübung oder Frage vor, die ihnen JETZT hilft. 
        Sei präzise und direkt. Max. 70 Wörter.`
      ]
    },

    en: {
      system: `You are a seasoned couples therapist with 15+ years of clinical experience. 
      You analyze communication patterns, identify underlying emotional needs, and provide 
      specific, tailored advice. Avoid generic statements. Reference what was actually said.
      Vary your approach: sometimes focus on emotions, sometimes on communication techniques, 
      sometimes on practical solutions.`,
      
      userTemplates: [
        `Conversation history (${messageCount} messages):\n${conversationHistory}\n\n
        Identify the core issue in this specific exchange. What's really being communicated here 
        (including subtext)? Provide one concrete technique or reframe that fits this exact situation. 
        Max 70 words.`,
        
        `Analyzing these ${messageCount} messages:\n${conversationHistory}\n\n
        What is this couple missing right now? What need is going unspoken? 
        Give a specific, actionable prompt for their next 10 minutes of conversation. 
        Max 70 words.`,
        
        `Couple's dialogue:\n${conversationHistory}\n\n
        Read the emotional subtext. What is each person really feeling? 
        Suggest one concrete communication exercise or question that will help them RIGHT NOW. 
        Be precise and direct. Max 70 words.`
      ]
    },

    sq: {
      system: `Je një terapist marrëdhëniesh me mbi 15 vjet përvojë klinike. 
      Analizon modelet e komunikimit, identifikon nevojat emocionale dhe jep këshilla specifike 
      të përshtatura. Shmang deklaratat e përgjithshme. Referohu drejtpërdrejt në atë që është thënë.
      Varioje qasjen: ndonjëherë fokusohu tek emocionet, ndonjëherë tek teknikat e komunikimit, 
      ndonjëherë tek zgjidhjet praktike.`,
      
      userTemplates: [
        `Historia e bisedës (${messageCount} mesazhe):\n${conversationHistory}\n\n
        Identifiko problemin kryesor në këtë shkëmbim specifik. Çfarë po komunikohet realisht këtu 
        (duke përfshirë nëntekstin)? Jep një teknikë konkrete ose perspektivë që i përshtatet 
        saktësisht kësaj situate. Maks. 70 fjalë.`,
        
        `Analizë e këtyre ${messageCount} mesazheve:\n${conversationHistory}\n\n
        Çfarë po humbin këta dy në këtë moment? Cila nevojë nuk po shprehet? 
        Jep një impuls specifik dhe të zbatueshëm për 10 minutat e ardhshme të bisedës së tyre. 
        Maks. 70 fjalë.`,
        
        `Dialogu i çiftit:\n${conversationHistory}\n\n
        Lexo nëntekstin emocional. Çfarë po ndjejnë realisht secili? 
        Sugjero një ushtrim konkret komunikimi ose një pyetje që do t'i ndihmojë TANI. 
        Ji i saktë dhe direkt. Maks. 70 fjalë.`
      ]
    }
  };

  const langPrompts = prompts[language] || prompts["en"];
  
  // Zgjedh template të ndryshëm bazuar në numrin e mesazheve (krijon variety)
  const templateIndex = messageCount % langPrompts.userTemplates.length;
  
  return {
    system: langPrompts.system,
    user: langPrompts.userTemplates[templateIndex]
  };
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
      language: string;
    } = req.body;

    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (!openAIApiKey) throw new Error("OpenAI API key not configured");

    // Merr më shumë kontekst për analiza më të mira
    const conversationHistory = messages
      .filter(msg => !msg.is_ai)
      .slice(-20) // Rrit nga 15 në 20 për kontekst më të mirë
      .map(msg => `${msg.sender_name}: ${msg.content}`)
      .join("\n");

    const { system: systemPrompt, user: userPrompt } = generateContextualPrompt(
      conversationHistory,
      messageCount,
      speakerCount,
      language
    );

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
        temperature: 0.85, 
        max_tokens: 150,
        presence_penalty: 0.6, 
        frequency_penalty: 0.5, 
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
// const prompts: Record<string, (conversationHistory: string) => { system: string; user: string }> = {
//   de: (conversationHistory) => ({
//     system: "Du bist ein erfahrener Paartherapeut mit Schwerpunkt auf Kommunikation und emotionaler Intelligenz. Sprich ruhig, einfühlsam und praxisnah.",
//     user: `Hier ist der Gesprächsverlauf des Paares:\n\n${conversationHistory}\n\nAnalysiere kurz den emotionalen Ton (z.B. Missverständnis, Rückzug, Frustration, Nähe) und gib **1–2 klare, konkrete Ratschläge**, wie das Paar die Kommunikation sofort verbessern kann. Verwende maximal 70 Wörter und bleibe empathisch, positiv und lösungsorientiert.`
//   }),

//   en: (conversationHistory) => ({
//     system: "You are a professional couples therapist specializing in emotional communication and conflict resolution. Speak warmly and constructively.",
//     user: `Here is the couple's recent conversation:\n\n${conversationHistory}\n\nBriefly identify the emotional tone (e.g., misunderstanding, distance, defensiveness, affection) and give **1–2 short, actionable suggestions** to help them communicate better right now. Use no more than 70 words and keep the tone empathetic and encouraging.`
//   }),

//   sq: (conversationHistory) => ({
//     system: "Je një terapist marrëdhëniesh me përvojë, i specializuar në komunikim emocional dhe mirëkuptim në çift. Fol me empati dhe qartësi.",
//     user: `Këtu është biseda e fundit e çiftit:\n\n${conversationHistory}\n\nAnalizo shkurt tonin emocional (p.sh. keqkuptim, mërzitje, afrimitet) dhe jep **1–2 këshilla të qarta dhe praktike** për të përmirësuar komunikimin menjëherë. Mos e zgjat më shumë se 70 fjalë dhe ruaj tonin e ngrohtë dhe mbështetës.`
//   }),
// };


// router.post("/", async (req: Request, res: Response) => {
//   try {
//     const {
//       messages,
//       sessionId,
//       messageCount,
//       speakerCount,
//       language
//     }: {
//       messages: { sender_name: string; content: string; is_ai: boolean }[];
//       sessionId: string;
//       messageCount: number;
//       speakerCount: number;
//       language: string; // de | en | sq
//     } = req.body;

//     const openAIApiKey = process.env.OPENAI_API_KEY;
//     if (!openAIApiKey) throw new Error("OpenAI API key not configured");

//     const conversationHistory = messages
//       .filter(msg => !msg.is_ai)
//       .slice(-15)
//       .map(msg => `${msg.sender_name}: ${msg.content}`)
//       .join("\n");

//     const { system: systemPrompt, user: userPrompt } =
//       (prompts[language] || prompts["en"])(conversationHistory);

//     const responseAI = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${openAIApiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         model: "gpt-4o-mini",
//         messages: [
//           { role: "system", content: systemPrompt },
//           { role: "user", content: userPrompt },
//         ],
//         temperature: 0.7,
//         max_tokens: 150,
//       }),
//     });

//     const data = (await responseAI.json()) as OpenAIChatResponse;

//     if (!data.choices || !data.choices[0]?.message?.content) {
//       throw new Error("Invalid OpenAI response format");
//     }

//     const aiResponse = data.choices[0].message.content;
//     res.json({ response: aiResponse, success: true });

//   } catch (error: any) {
//     res.json({
//       response: "Sorry, there was a brief technical issue. However, your communication shows engagement with each other.",
//       success: false,
//       error: error.message,
//     });
//   }
// });

// export default router;
