const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// APIキーの設定（環境変数から取得）
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY is not set.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// テスト対象の画像と期待されるバーコード
const testCases = [
  { filename: "IMG_3595.jpeg", expected: "7622100826460" },
  { filename: "IMG_3590.jpeg", expected: "4945274954207" },
  { filename: "S__65372162.jpg", expected: "4945274954207" },
  { filename: "IMG_3589.jpeg", expected: "4903110475118" }
];

async function testImage(filename, expected) {
  try {
    const imagePath = path.join("/home/ubuntu/upload", filename);
    if (!fs.existsSync(imagePath)) {
      console.error(`File not found: ${imagePath}`);
      return false;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Analyze the provided image and identify any barcode (EAN-13, JAN, UPC-A, UPC-E, etc.).
      
      Return the result in the following JSON format ONLY:
      {
        "found": boolean,
        "barcode": "string" (digits only),
        "type": "string" (e.g., "EAN-13", "UPC", "Unknown"),
        "confidence": "high" | "medium" | "low"
      }

      If multiple barcodes are found, return the most prominent/center one.
      If no barcode is found, set "found" to false and "barcode" to null.
      Do not include any markdown formatting (like \`\`\`json). Just the raw JSON string.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    let text = response.text().trim();
    
    // Markdownのコードブロックを除去
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    console.log(`[${filename}] Raw Response: ${text}`);

    let barcode = "";
    try {
      const json = JSON.parse(text);
      if (json.found && json.barcode) {
        barcode = json.barcode;
      }
    } catch (e) {
      console.warn(`[${filename}] JSON Parse Error, falling back to regex`);
      barcode = text.replace(/\D/g, "");
    }

    console.log(`[${filename}] Expected: ${expected}, Got: ${barcode}`);

    if (barcode === expected) {
      console.log("✅ SUCCESS");
      return true;
    } else {
      console.log("❌ FAILED");
      return false;
    }
  } catch (error) {
    console.error(`[${filename}] Error:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log("Starting Gemini API Barcode Scan Tests...");
  let successCount = 0;

  for (const testCase of testCases) {
    const success = await testImage(testCase.filename, testCase.expected);
    if (success) successCount++;
    // APIレート制限を避けるために少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\nTest Results: ${successCount}/${testCases.length} passed.`);
}

runTests();
