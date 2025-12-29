"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanBarcodeFromImage = void 0;
const functions = require("firebase-functions");
const generative_ai_1 = require("@google/generative-ai");
// 環境変数からAPIキーを取得
// 注意: Firebase Functionsの環境設定で GEMINI_API_KEY を設定する必要があります
const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
exports.scanBarcodeFromImage = functions.runWith({
    timeoutSeconds: 60,
    memory: "1GB"
}).https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { imageBase64 } = data;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid image base64 string.');
    }
    // デバッグログ: 受け取ったデータの先頭を表示
    console.log(`Received image data (length: ${imageBase64.length}). Start: ${imageBase64.substring(0, 50)}...`);
    try {
        // Geminiモデルの初期化 (Gemini 2.0 Flash は高速で安価)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        // プロンプトの作成 (JSON出力を強制)
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
        // 画像データの準備 (Base64ヘッダーをより堅牢に除去)
        // data:image/jpeg;base64, などのヘッダーがあれば削除、なければそのまま
        const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg", // 一般的な画像形式としてJPEGを指定
            },
        };
        // 生成実行
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text().trim();
        // Markdownのコードブロックを除去 (念のため)
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        console.log("Gemini Scan Result (Raw):", text);
        let parsedResult;
        try {
            parsedResult = JSON.parse(text);
        }
        catch (e) {
            console.warn("Failed to parse JSON from Gemini:", e);
            // JSONパースに失敗した場合のフォールバック（数字のみ抽出）
            const digits = text.replace(/\D/g, "");
            if (digits.length >= 8 && digits.length <= 14) {
                parsedResult = { found: true, barcode: digits, type: "Unknown", confidence: "low" };
            }
            else {
                return { success: false, message: "Failed to parse AI response", rawResponse: text };
            }
        }
        if (!parsedResult.found || !parsedResult.barcode) {
            return { success: false, message: "Barcode not found in image" };
        }
        const barcode = parsedResult.barcode;
        // JANコードのバリデーション (簡易: 8桁または13桁)
        // UPC (12桁) も許容
        if (barcode.length >= 8 && barcode.length <= 14) {
            return {
                success: true,
                barcode,
                type: parsedResult.type,
                confidence: parsedResult.confidence
            };
        }
        else {
            return { success: false, message: `Invalid barcode length: ${barcode.length}`, raw: barcode };
        }
    }
    catch (error) {
        console.error("Gemini API Error:", error);
        // エラーの詳細をクライアントに返す（デバッグ用）
        throw new functions.https.HttpsError('internal', `Failed to process image with Gemini API: ${error.message}`);
    }
});
//# sourceMappingURL=geminiScanner.js.map