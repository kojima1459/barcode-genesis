import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { generateRobotData } from "./robotGenerator";
import { simulateBattle } from "./battleSystem";
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

// バトル開始API
export const startBattle = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { myRobotId, enemyRobotId } = data;
  const userId = context.auth.uid;

  try {
    // 自分のロボットを取得
    const myRobotDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('robots')
      .doc(myRobotId)
      .get();

    if (!myRobotDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'My robot not found');
    }

    // 敵ロボットを取得（今回は自分のロボット同士で戦う簡易版とする、またはCPU）
    // 本来は他のユーザーのロボットを取得するが、デモ用に自分のコレクションから取得
    const enemyRobotDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('robots')
      .doc(enemyRobotId)
      .get();

    if (!enemyRobotDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Enemy robot not found');
    }

    const myRobot = { id: myRobotDoc.id, ...myRobotDoc.data() } as any;
    const enemyRobot = { id: enemyRobotDoc.id, ...enemyRobotDoc.data() } as any;

    // バトルシミュレーション実行
    const result = simulateBattle(myRobot, enemyRobot);

    // Update win/loss records and EXP
    // Note: This assumes enemy is also a user robot. For CPU, we skip update.
    // For friend battle, we need to find the owner of the enemy robot.
    // Since we don't pass enemyUserId, we'll search for it or assume it's in the robot data if we added it.
    // For now, we only update MY robot's stats to keep it simple and safe.
    
    const myRobotRef = admin.firestore().collection('users').doc(userId).collection('robots').doc(myRobotId);

    await admin.firestore().runTransaction(async (t) => {
      const doc = await t.get(myRobotRef);
      if (!doc.exists) return;
      
      const robot = doc.data() as any;
      const isWinner = result.winnerId === myRobotId;
      
      if (isWinner) {
        const currentExp = (robot.exp || 0) + result.rewards.exp;
        const currentLevel = robot.level || 1;
        const expToNextLevel = currentLevel * 100;
        
        let updates: any = {
          exp: currentExp,
          wins: (robot.wins || 0) + 1
        };
        
        // Level Up Logic
        if (currentExp >= expToNextLevel) {
          updates.level = currentLevel + 1;
          updates.baseHp = Math.floor(robot.baseHp * 1.1);
          updates.baseAttack = Math.floor(robot.baseAttack * 1.1);
          updates.baseDefense = Math.floor(robot.baseDefense * 1.1);
          updates.baseSpeed = Math.floor(robot.baseSpeed * 1.1);
        }
        
        t.update(myRobotRef, updates);
      } else {
        t.update(myRobotRef, {
          losses: (robot.losses || 0) + 1
        });
      }
    });

    return { success: true, result };

  } catch (error) {
    console.error("Battle error:", error);
    throw new functions.https.HttpsError('internal', 'Battle failed');
  }
});
