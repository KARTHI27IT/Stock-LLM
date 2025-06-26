const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/generate-report', upload.single('screenshot'), async (req, res) => {
  const goal = req.body.goal;
  const imageBuffer = req.file.buffer;

  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, 'eng');

    const prompt = `Here is a stock report from a screenshot:\n${text}\nBased on the user's goal "${goal}", generate an insightful report or recommendation.`;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const report = result.response.text();

    res.json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process image and generate report.' });
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
