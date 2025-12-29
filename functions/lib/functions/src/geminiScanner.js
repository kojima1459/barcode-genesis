"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanBarcodeFromImage = void 0;
const functions = require("firebase-functions");
const generative_ai_1 = require("@google/generative-ai");
// 環境変数からAPIキーを取得
// 注意: Firebase Functionsの環境設定で GEMINI_API_KEY を設定する必要があります
const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
exports.scanBarcodeFromImage = functions.https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { imageBase64 } = data;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid image base64 string.');
    }
    try {
        // Geminiモデルの初期化 (Gemini 1.5 Flash は高速で安価)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        // プロンプトの作成
        const prompt = "この画像に含まれているバーコード（JANコード/EANコード）の数字（通常13桁または8桁）を読み取って、数字のみを出力してください。バーコードが見つからない場合や読み取れない場合は 'null' と出力してください。余計な説明は不要です。";
        // 画像データの準備 (Base64ヘッダーを除去)
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg", // 一般的な画像形式としてJPEGを指定（PNGでも動作します）
            },
        };
        // 生成実行
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text().trim();
        console.log("Gemini Scan Result:", text);
        // 結果の解析
        if (text === 'null' || !text) {
            return { success: false, message: "Barcode not found in image" };
        }
        // 数字のみを抽出（改行やスペースを除去）
        const barcode = text.replace(/\D/g, "");
        // JANコードのバリデーション (簡易: 8桁または13桁)
        if (barcode.length === 13 || barcode.length === 8) {
            return { success: true, barcode };
        }
        else {
            // 桁数が合わない場合でも、数字が取れていれば返す（フロントで判断させる）
            // ただし、あまりに短い/長い場合はエラー扱い
            if (barcode.length >= 8 && barcode.length <= 14) {
                return { success: true, barcode };
            }
            return { success: false, message: "Invalid barcode length detected", raw: text };
        }
    }
    catch (error) {
        console.error("Gemini API Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to process image with Gemini API.');
    }
});
//# sourceMappingURL=geminiScanner.js.map