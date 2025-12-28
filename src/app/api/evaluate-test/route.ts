
import { NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { brief, content, path } = await req.json();

        const prompt = `
      You are a quality assurance auditor for an SEO content engine.
      Your task is to compare a CREATIVE BRIEF with the GENERATED CONTENT and score the alignment.

      CREATIVE BRIEF:
      ${JSON.stringify(brief, null, 2)}

      GENERATED CONTENT:
      ${content}

      Evaluate based on:
      1. Keyword adherence (Were all primary/secondary keywords used?)
      2. Tone alignment (Does it match the requested tone?)
      3. Audience targeting (Is it written for the specified audience?)
      4. Structure (Does it follow the expected format for a ${path}?)

      Return a JSON object:
      {
        "score": 0-100,
        "alignment_rank": "Excellent|Good|Fair|Poor",
        "missing_keywords": [],
        "misalignments": [],
        "suggestions": ""
      }
    `.trim();

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return NextResponse.json(result);
    } catch (error) {
        console.error("Evaluation Error:", error);
        return NextResponse.json({ error: "Failed to evaluate" }, { status: 500 });
    }
}
