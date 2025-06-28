const express = require('express');
const multer = require('multer');
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
app.use('/reports', express.static(path.join(__dirname, 'reports')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

mongoose.connect("mongodb://localhost:27017/StockLLM", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
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
    const imageParts = files.map(file => ({
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64'),
      }
    }));

    const prompt = `
You are a professional financial advisor AI. Analyze the user's investment portfolio using the uploaded screenshots. Extract all visible financial information and generate a structured report.

USER GOAL: "${goal}"

INSTRUCTIONS:
- Use ONLY the uploaded screenshots to extract data (don't assume or hallucinate).
- Respond using EXACTLY 8 sections below in order.
- Use exact titles and format like: 1. *Section Title*
- Each section should be 2–4 short paragraphs.
- Section 8 is a table or bullet list with accurate financial breakdown.

REQUIRED SECTIONS:
1. *Summary & Portfolio Characteristics*
2. *Goal Alignment Grade*
3. *Goal Alignment Percentage*
4. *Risk Meter*
5. *Estimated 5-Year Return*
6. *Where You Are Strong*
7. *Where You Need to Improve*
8. *Asset Allocation Breakdown*

SECTION 8 FORMAT:
- Accurately list each asset with:
  - Asset name (e.g., NIFTYIETFR-EQ, GOLDBEES-EQ)
  - Type (Stock, Gold, Crypto, Mutual Fund, etc.)
  - Invested Amount
  - Current Value
- Extract values from visible screenshot data. Be precise and avoid estimating.
- Format as a table or structured list.
    `;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 3000,
      },
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          ...imageParts
        ],
      }]
    });

    const rawReport = result.response.text();
    const report = cleanAndValidateReport(rawReport);
    const assetSection = extractAssetBreakdown(report);
    const assetList = parseAssets(assetSection);

    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

    const filename = `${Date.now()}_${email.replace(/[@.]/g, '_')}_report.pdf`;
    const fullPath = path.join(reportsDir, filename);
    const publicPath = `reports/${filename}`;

    await generatePDF(report, fullPath);

    const user = await userSchemaModel.findOneAndUpdate(
      { email },
      {
        $push: {
          reports: {
            reportName: `Investment Report - ${new Date().toLocaleDateString()}`,
            reportData: report,
            reportPdf: publicPath,
            assets: assetList
          }
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ report, pdfPath: publicPath });

  } catch (err) {
    console.error('❌ Error generating report:', err);
    res.status(500).json({
      error: 'Failed to generate report from screenshots.',
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
      4: '#d35400', 5: '#8e44ad', 6: '#16a085', 7: '#c0392b', 8: '#7f8c8d'
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
    /^7\.\s*\*.*Where.*Improve.*\*/i,
    /^8\.\s*\*.*Asset.*Allocation.*Breakdown.*\*/i
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

function extractAssetBreakdown(report) {
  const lines = report.split('\n');
  const startIndex = lines.findIndex(line =>
    /^8\.\s*\*Asset\s*Allocation\s*Breakdown\*/i.test(line)
  );
  if (startIndex === -1) return '';
  return lines.slice(startIndex + 1).join('\n');
}


const parseAssets = (text) => {
  const rows = text
    .split('\n')
    .map(line => line.trim())
    .filter(line =>
      line &&
      line.includes('|') &&
      !line.toLowerCase().includes('asset name') &&
      !line.includes('----')
    );

  const parsedRows = [];

  for (const row of rows) {
    const parts = row.split('|').map(cell => cell.trim()).filter(Boolean);
    if (parts.length === 4) {
      parsedRows.push({
        assetName: parts[0],
        assetType: parts[1],
        investedValue: parts[2],
        currentValue: parts[3]
      });
    }
  }

  return parsedRows;
};


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
