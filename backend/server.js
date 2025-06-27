const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();
const mongoose = require("mongoose");
const app = express();
app.use(cors());
const userController = require("./userController/userController");
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



mongoose.connect("mongodb://localhost:27017/StockLLM", { useNewUrlParser: true, useUnifiedTopology: true })

  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log("error:", err);
});



app.post("/user/signup", userController.userCreate);
app.post("/user/login",userController.userLogin);


app.post('/generate-report', upload.single('screenshot'), async (req, res) => {
  console.log('📩 Received request at /generate-report');

  const goal = req.body.goal;
  const imageBuffer = req.file?.buffer;

  if (!goal || !imageBuffer) {
    console.error('❌ Missing goal or image');
    return res.status(400).json({ error: 'Missing goal or image' });
  }

  try {
    console.log('🔍 Running OCR...');
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
    console.log('📄 OCR Extracted Text:\n', text);

    const prompt = `
You are a professional financial advisor AI. Analyze the portfolio data and provide a structured investment report.

PORTFOLIO DATA:
${text}

USER GOAL: "${goal}"

INSTRUCTIONS:
- Respond using EXACTLY 7 sections below in order.
- Use exact titles and format like: 1. *Section Title*
- Each section should be 2–4 short paragraphs.
- Do NOT add intro or extra commentary.
- Begin with section 1 and end after section 7.

REQUIRED SECTIONS:

1. *Summary & Portfolio Characteristics*
2. *Goal Alignment Grade*
3. *Goal Alignment Percentage*
4. *Risk Meter*
5. *Estimated 5-Year Return*
6. *Where You Are Strong*
7. *Where You Need to Improve*
`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2000,
      }
    });

    const result = await safeGenerateContent(model, prompt);
    const rawReport = result.response.text();

    console.log('\n🧾 ========== RAW GEMINI RESPONSE ========== \n');
    console.log(rawReport);
    console.log('\n===========================================\n');

    let report = cleanAndValidateReport(rawReport);

    console.log('\n📋 ========== FINAL REPORT TO RETURN ========== \n');
    console.log(report);
    console.log('\n================================================\n');

    res.json({ report });

  } catch (err) {
    console.error('❌ Gemini Error Details:');
    console.error('Status:', err.status || 'N/A');
    console.error('Status Text:', err.statusText || 'N/A');
    console.error('Message:', err.message);
    console.error('Stack Trace:', err.stack);
    res.status(500).json({
      error: 'Failed to process image and generate report.',
      status: err.status || 500,
      message: err.message || 'Unknown error'
    });
  }
});

// Retry logic
async function safeGenerateContent(model, prompt, retries = 3, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      if (err.status === 503 && i < retries - 1) {
        console.warn(`Gemini overloaded (503). Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

// Validates and formats the report
function cleanAndValidateReport(report) {
  report = report.trim().replace(/\r\n/g, '\n');
  const lines = report.split('\n');
  const expectedSections = [
    /^1\.\s*\*Summary\s&\sPortfolio\sCharacteristics\*/i,
    /^2\.\s*\*Goal\sAlignment\sGrade\*/i,
    /^3\.\s*\*Goal\sAlignment\sPercentage\*/i,
    /^4\.\s*\*Risk\sMeter\*/i,
    /^5\.\s*\*Estimated\s5[-\s]?Year\sReturn\*/i,
    /^6\.\s*\*Where\sYou\sAre\sStrong\*/i,
    /^7\.\s*\*Where\sYou\sNeed\sto\sImprove\*/i,
  ];

  let cleanedLines = [];
  let sectionCount = 0;
  let foundStart = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!foundStart && !trimmed) continue;

    const matchIndex = expectedSections.findIndex(pattern => pattern.test(trimmed));
    if (matchIndex === sectionCount) {
      foundStart = true;
      sectionCount++;
      cleanedLines.push(line);
    } else if (foundStart) {
      if (trimmed.match(/^\d+\.\s*\*\*.*\*\*$/) &&
          !expectedSections.some(p => p.test(trimmed))) {
        break;
      }
      cleanedLines.push(line);
    }
  }

  if (sectionCount < 7) {
    console.warn(`⚠ Report parsing failed, found only ${sectionCount}/7 sections.`);
    console.log('\n⚠ Showing raw Gemini output as fallback:');
    return fixCommonFormattingIssues(report);
  }

  console.log(`✅ Parsed all ${sectionCount} sections correctly.`);
  return cleanedLines.join('\n');
}

// Fixes common formatting mistakes
function fixCommonFormattingIssues(report) {
  let fixed = report;

  fixed = fixed.replace(/^(\d+)\.\s*\?\?([^\n]+)\?\?$/gm, '$1. **$2*');

  const titleFixes = [
    [/1\.\s*\*?Summary[^]*Portfolio[^]*Characteristics\*/gi, '1. *Summary & Portfolio Characteristics*'],
    [/2\.\s*\*?Goal[^]*Alignment[^]*Grade\*/gi, '2. *Goal Alignment Grade*'],
    [/3\.\s*\*?Goal[^]*Alignment[^]*Percentage\*/gi, '3. *Goal Alignment Percentage*'],
    [/4\.\s*\*?Risk[^]*Meter\*/gi, '4. *Risk Meter*'],
    [/5\.\s*\*?Estimated[^]*5[-\s]?Year[^]*Return\*/gi, '5. *Estimated 5-Year Return*'],
    [/6\.\s*\*?Where[^]*You[^]*Are[^]*Strong\*/gi, '6. *Where You Are Strong*'],
    [/7\.\s*\*?Where[^]*You[^]*Need[^]*to[^]*Improve\*/gi, '7. *Where You Need to Improve*'],
  ];

  for (const [pattern, replacement] of titleFixes) {
    fixed = fixed.replace(pattern, replacement);
  }

  return fixed.trim();
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: '✅ Server running',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Test Gemini endpoint
app.get('/test-gemini', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent('Say "Hello, Gemini is working!"');
    res.json({ status: 'success', response: result.response.text() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔑 Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
});
