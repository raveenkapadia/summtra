const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function extractTextFromPDF(pdfPath) {
  const absolutePath = path.resolve(pdfPath);
  const buffer = fs.readFileSync(absolutePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text || '';
}

async function getPDFPageCount(pdfPath) {
  const absolutePath = path.resolve(pdfPath);
  const buffer = fs.readFileSync(absolutePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.pages?.length || 0;
}

module.exports = { extractTextFromPDF, getPDFPageCount };
