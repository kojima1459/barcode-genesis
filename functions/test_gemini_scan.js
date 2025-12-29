const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// 環境変数からAPIキーを取得
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY is not set.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function testScan() {
  try {
    // 画像パス (ユーザーがアップロードしたファイル)
    const imagePath = "/home/ubuntu/upload/S__65372162.jpg";
    
    if (!fs.existsSync(imagePath)) {
      console.error(`Error: Image file not found at ${imagePath}`);
      process.exit(1);
    }

    console.log(`Reading image from ${imagePath}...`);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Data = imageBuffer.toString("base64");

    console.log("Initializing Gemini model...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = "この画像に含まれているバーコード（JANコード/EANコード）の数字（通常13桁または8桁）を読み取って、数字のみを出力してください。バーコードが見つからない場合や読み取れない場合は 'null' と出力してください。余計な説明は不要です。";

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    console.log("Sending request to Gemini API...");
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim();

    console.log("---------------------------------------------------");
    console.log("Gemini Raw Output:", text);
    
    const barcode = text.replace(/\D/g, "");
    console.log("Extracted Barcode:", barcode);
    
    const expected = "4945274954207";
    if (barcode === expected) {
        console.log("✅ SUCCESS: Correctly identified the target barcode!");
    } else {
        console.log(`❌ FAILURE: Expected ${expected}, but got ${barcode}`);
    }
    console.log("---------------------------------------------------");

  } catch (error) {
    console.error("Test Error:", error);
  }
}

testScan();
