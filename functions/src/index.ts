import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { generateRobotData } from "./robotGenerator";
import { GenerateRobotRequest, GenerateRobotResponse } from "./types";

admin.initializeApp();

// ロボット生成API
export const generateRobot = functions.https.onCall(async (data: GenerateRobotRequest, context): Promise<GenerateRobotResponse> => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { barcode } = data;
  
  // バリデーション
  if (!barcode || typeof barcode !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a valid barcode.'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // 既存チェック: 同じバーコードのロボットを既に持っているか？
    const existingRobots = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('robots')
      .where('sourceBarcode', '==', barcode)
      .get();
      
    if (!existingRobots.empty) {
      return {
        success: false,
        error: 'You already have a robot from this barcode.'
      };
    }

    // ロボットデータ生成
    const robotData = generateRobotData(barcode, userId);
    
    // Firestoreに保存
    const robotRef = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('robots')
      .add(robotData);
      
    // IDを追加して返す
    return {
      success: true,
      robot: {
        ...robotData,
        id: robotRef.id,
        // TimestampをDateに変換して返す（クライアント側での扱いやすさのため）
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error("Error generating robot:", error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while generating the robot.'
    );
  }
});
