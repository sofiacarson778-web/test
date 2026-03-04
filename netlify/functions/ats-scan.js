const fetch = (...args) => global.fetch(...args);
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const StreamZip = require("node-stream-zip");

const { calculateScore } = require("./scorer");

const GROQ_API_KEY = process.env.GROQ_API_KEY;


// ---------- PDF TEXT EXTRACTION ----------
async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || "";
}


// ---------- DOCX TEXT EXTRACTION ----------
async function extractDocxText(filePath) {
  const zip = new StreamZip.async({ file: filePath });
  const data = await zip.entryData("word/document.xml");
  await zip.close();

  return data.toString()
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}


// ---------- GROQ ANALYSIS ----------
async function analyzeWithGroq(resumeText, jobDescription) {

  const prompt = `
Analyze the resume against the job description.

Return ONLY valid JSON:

{
  "skillsMatch": number between 0 and 1,
  "keywordMatch": number between 0 and 1,
  "experienceScore": number between 0 and 1,
  "achievementScore": number between 0 and 1,
  "actionVerbScore": number between 0 and 1,
  "formatScore": number between 0 and 1,
  "educationScore": number between 0 and 1,
  "missingSkills": [],
  "improvements": []
}

Resume:
${resumeText}

Job Description:
${jobDescription}
`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 800
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const result = await response.json();

  const content =
    result?.choices?.[0]?.message?.content || "{}";


  // ---------- SAFE JSON PARSER ----------
  let parsed;

  try {
    const cleaned = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } else {
      throw new Error("JSON not found");
    }

  } catch (err) {
    console.log("AI JSON parse failed:", content);

    parsed = {
      skillsMatch: 0,
      keywordMatch: 0,
      experienceScore: 0,
      achievementScore: 0,
      actionVerbScore: 0,
      formatScore: 0,
      educationScore: 0,
      missingSkills: [],
      improvements: ["AI formatting issue detected"]
    };
  }

  return parsed;
}


// ---------- MAIN FUNCTION ----------
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const buffer = Buffer.from(body.resume, "base64");
    const tempPath = path.join("/tmp", body.fileName);

    fs.writeFileSync(tempPath, buffer);

    let extractedText = "";
    const name = body.fileName.toLowerCase();

    if (name.endsWith(".pdf")) {
      extractedText = await extractPdfText(tempPath);
    } else if (name.endsWith(".docx")) {
      extractedText = await extractDocxText(tempPath);
    }

    fs.unlinkSync(tempPath);

    if (!extractedText) {
      throw new Error("No text extracted");
    }

    const aiResult = await analyzeWithGroq(
      extractedText.slice(0, 12000),
      body.jobDescription || ""
    );

    const finalScore = calculateScore(aiResult);
    aiResult.finalScore = finalScore;
    aiResult.score = finalScore;

    return {
      statusCode: 200,
      body: JSON.stringify(aiResult)
    };

  } catch (error) {
    console.log("ATS ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Scan failed",
        details: error.message
      })
    };
  }
};