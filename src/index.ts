import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiCoachRouter from "./AiGenerator/router/aiCoach";
dotenv.config();
const myEnv: Record<string, string> = {};

// ngarkoj .env në objektin tim (nuk prek process.env global)
dotenv.config({ processEnv: myEnv });
const app = express();

app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); 
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

app.get("/", (req, res) => {
  res.send("Server is running");
});
app.use("/ai-coach", aiCoachRouter);

const PORT = Number(process.env.PORT) || 8000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});