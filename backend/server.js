const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const mongoose = require("mongoose");
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const userController = require("./userController/userController");
const { userSchemaModel } = require('./userController/userModel');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve the reports folder statically
app.use('/reports', express.static(path.join(__dirname, 'reports')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ MongoDB Connect
mongoose.connect("mongodb://localhost:27017/StockLLM", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB error:", err));

app.post("/user/signup", userController.userCreate);
app.post("/user/login", userController.userLogin);
app.post('/user/details', userController.userDetails);

app.post('/generate-report', upload.array('screenshots'), async (req, res) => {
  const goal = req.body.goal;
  const files = req.files;
  const email = req.body.email;

  if (!goal || !files || files.length === 0 || !email) {
    return res.status(400).json({ error: 'Missing goal, screenshots, or email' });
  }

  try {
    const ocrResults = await Promise.all(
      files.map(file =>
        Tesseract.recognize(file.buffer, 'eng').then(({ data }) => data.text)
      )
    );
    const combinedText = ocrResults.join('\n\n---\n\n');

    const prompt = `
You are a professional financial advisor AI. Analyze the portfolio data and provide a structured investment report.

PORTFOLIO DATA (from multiple images):
${combinedText}

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
      },
    });

    const result = await safeGenerateContent(model, prompt);
    const rawReport = result.response.text();
    const report = cleanAndValidateReport(rawReport);

    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

    const filename = `${Date.now()}_${email.replace(/[@.]/g, '_')}_report.pdf`;
    const fullPath = path.join(reportsDir, filename);
    const publicPath = `reports/${filename}`; // ✅ for download URL

    await generatePDF(report, fullPath);

    const user = await userSchemaModel.findOneAndUpdate(
      { email },
      { reportData: report, reportPdf: publicPath }, // ✅ store relative path
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ report, pdfPath: publicPath }); // ✅ frontend will use http://localhost:5000/reports/filename.pdf

  } catch (err) {
    console.error('❌ Error generating report:', err);
    res.status(500).json({
      error: 'Failed to process image(s) and generate report.',
      message: err.message || 'Unknown error'
    });
  }
});

function generatePDF(text, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.font('Helvetica').fontSize(12);

    const sectionColors = {
      1: '#2c3e50', 2: '#2980b9', 3: '#27ae60',
      4: '#d35400', 5: '#8e44ad', 6: '#16a085', 7: '#c0392b',
    };

    const lines = text.split('\n');
    let currentSection = 0;

    for (let line of lines) {
      const match = line.match(/^(\d)\.\s\*(.*?)\*/);
      if (match) {
        currentSection = match[1];
        const sectionTitle = match[2].trim();
        doc.moveDown(1)
          .fillColor(sectionColors[currentSection] || '#000')
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(`${match[1]}. ${sectionTitle}`, { underline: true })
          .moveDown(0.5)
          .fontSize(12)
          .fillColor('black')
          .font('Helvetica');
      } else {
        doc.text(line, { lineGap: 4 });
      }
    }

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

async function safeGenerateContent(model, prompt, retries = 3, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      if (err.status === 503 && i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

function cleanAndValidateReport(report) {
  report = report.trim().replace(/\r\n/g, '\n');
  const lines = report.split('\n');
  const expectedSections = [
    /^1\.\s*\*.*Summary.*Portfolio.*\*/i,
    /^2\.\s*\*.*Goal.*Alignment.*Grade.*\*/i,
    /^3\.\s*\*.*Goal.*Alignment.*Percentage.*\*/i,
    /^4\.\s*\*.*Risk.*Meter.*\*/i,
    /^5\.\s*\*.*Estimated.*5.*Year.*Return.*\*/i,
    /^6\.\s*\*.*Where.*Strong.*\*/i,
    /^7\.\s*\*.*Where.*Improve.*\*/i
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
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n');
}

app.get('/health', (req, res) => {
  res.json({
    status: '✅ Server running',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔑 Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
});
