import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { generateRobotData } from "./robotGenerator";
import { simulateBattle } from "./battleSystem";
import { GenerateRobotRequest, GenerateRobotResponse } from "./types";
import { getRandomSkill, normalizeSkillIds } from "./skills";

admin.initializeApp();

const normalizeBarcodeId = (barcode: string): string => {
  const digits = barcode.replace(/[^0-9]/g, "");
  return digits.padEnd(13, "0").slice(0, 13);
};

const ITEM_CATALOG = {
  power_core: { price: 100 },
  shield_plate: { price: 80 },
  speed_chip: { price: 60 }
} as const;

type ItemId = keyof typeof ITEM_CATALOG;

const isItemId = (itemId: string): itemId is ItemId => {
  return Object.prototype.hasOwnProperty.call(ITEM_CATALOG, itemId);
};

const getUserCredits = (user: any): number => {
  const credits = user?.credits ?? 0;
  return typeof credits === "number" ? credits : 0;
};

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

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .set({ credits: 0 }, { merge: true });

    const normalizedBarcode = normalizeBarcodeId(barcode);

    // 既存チェック: 同じバーコードのロボットを既に持っているか？
    const existingRobots = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('robots')
      .where('sourceBarcode', '==', normalizedBarcode)
      .get();
      
    if (!existingRobots.empty) {
      return {
        success: false,
        error: 'You already have a robot from this barcode.'
      };
    }

    // ロボットデータ生成
    const robotData = generateRobotData(normalizedBarcode, userId);
    
    // Firestoreに保存
    const robotRef = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('robots')
      .doc(normalizedBarcode);

    await robotRef.set(robotData);
      
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
const MATERIAL_MAX_COUNT = 5;
const MATERIAL_LEVEL_XP = 25;
const LEVEL_XP = 100;
const INHERIT_SUCCESS_RATE = 0.35;
const MAX_SKILLS = 4;

const getRobotXp = (robot: any): number => {
  const xp = robot?.xp ?? robot?.exp ?? robot?.experience ?? 0;
  return typeof xp === "number" ? xp : 0;
};

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
        const currentExp = getRobotXp(robot) + result.rewards.exp;
        const currentLevel = robot.level || 1;
        const expToNextLevel = currentLevel * 100;
        
        let updates: any = {
          xp: currentExp,
          wins: (robot.wins || 0) + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Level Up Logic
        if (currentExp >= expToNextLevel) {
          const newLevel = currentLevel + 1;
          updates.level = newLevel;
          updates.baseHp = Math.floor(robot.baseHp * 1.1);
          updates.baseAttack = Math.floor(robot.baseAttack * 1.1);
          updates.baseDefense = Math.floor(robot.baseDefense * 1.1);
          updates.baseSpeed = Math.floor(robot.baseSpeed * 1.1);

          // Skill Acquisition & Upgrade Logic
          // New skill at Lv.3, Lv.5, Lv.10
          if ([3, 5, 10].includes(newLevel)) {
            const newSkill = getRandomSkill();
            const currentSkills = normalizeSkillIds(robot.skills);
            const alreadyHasSkill = currentSkills.includes(newSkill.id);

            if (alreadyHasSkill) {
              result.rewards.upgradedSkill = newSkill.name;
            } else if (currentSkills.length < 4) {
              currentSkills.push(newSkill.id);
              result.rewards.newSkill = newSkill.name;
              updates.skills = currentSkills;
            }
          }
        }
        
        t.update(myRobotRef, updates);
      } else {
        t.update(myRobotRef, {
          losses: (robot.losses || 0) + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    return { success: true, result };

  } catch (error) {
    console.error("Battle error:", error);
    throw new functions.https.HttpsError('internal', 'Battle failed');
  }
});

// 合成API
export const synthesizeRobots = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const baseRobotId = data?.baseRobotId;
  const materialRobotIds = data?.materialRobotIds;

  if (typeof baseRobotId !== "string" || !Array.isArray(materialRobotIds)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
  }

  const normalizedMaterials = materialRobotIds.filter((id: unknown) => typeof id === "string" && id.trim().length > 0) as string[];

  if (normalizedMaterials.length !== materialRobotIds.length) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid material robot IDs');
  }

  if (normalizedMaterials.length < 1 || normalizedMaterials.length > MATERIAL_MAX_COUNT) {
    throw new functions.https.HttpsError('invalid-argument', 'Materials must be between 1 and 5');
  }

  if (normalizedMaterials.includes(baseRobotId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Base robot cannot be a material');
  }

  const uniqueMaterialIds = new Set(normalizedMaterials);
  if (uniqueMaterialIds.size !== normalizedMaterials.length) {
    throw new functions.https.HttpsError('invalid-argument', 'Duplicate material robot IDs');
  }

  const userId = context.auth.uid;
  const robotsRef = admin.firestore().collection('users').doc(userId).collection('robots');
  const baseRef = robotsRef.doc(baseRobotId);
  const materialRefs = normalizedMaterials.map((id) => robotsRef.doc(id));

  const result = await admin.firestore().runTransaction(async (t) => {
    const baseSnap = await t.get(baseRef);
    if (!baseSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Base robot not found');
    }

    const materialSnaps = await Promise.all(materialRefs.map((ref) => t.get(ref)));
    materialSnaps.forEach((snap, index) => {
      if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', `Material robot not found: ${normalizedMaterials[index]}`);
      }
    });

    const baseData = baseSnap.data() as any;
    const baseXp = getRobotXp(baseData);

    const gainedXp = materialSnaps.reduce((total, snap) => {
      const material = snap.data() as any;
      const materialXp = getRobotXp(material);
      const materialLevel = typeof material.level === "number" ? material.level : 1;
      return total + materialXp + materialLevel * MATERIAL_LEVEL_XP;
    }, 0);

    const newXp = baseXp + gainedXp;
    const newLevel = Math.floor(newXp / LEVEL_XP) + 1;

    t.update(baseRef, {
      xp: newXp,
      level: newLevel,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    materialRefs.forEach((ref) => t.delete(ref));

    return { baseRobotId: baseRef.id, newLevel, newXp };
  });

  return result;
});

// 継承API
export const inheritSkill = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const baseRobotId = data?.baseRobotId;
  const materialRobotId = data?.materialRobotId;
  const skillId = data?.skillId;

  if (typeof baseRobotId !== "string" || typeof materialRobotId !== "string" || typeof skillId !== "string") {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
  }

  if (baseRobotId === materialRobotId) {
    throw new functions.https.HttpsError('invalid-argument', 'Material robot cannot be the base robot');
  }

  const userId = context.auth.uid;
  const robotsRef = admin.firestore().collection('users').doc(userId).collection('robots');
  const baseRef = robotsRef.doc(baseRobotId);
  const materialRef = robotsRef.doc(materialRobotId);

  const result = await admin.firestore().runTransaction(async (t) => {
    const [baseSnap, materialSnap] = await Promise.all([t.get(baseRef), t.get(materialRef)]);

    if (!baseSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Base robot not found');
    }

    if (!materialSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Material robot not found');
    }

    const baseData = baseSnap.data() as any;
    const materialData = materialSnap.data() as any;

    const baseSkills = normalizeSkillIds(baseData.skills);
    const materialSkills = normalizeSkillIds(materialData.skills);

    if (!materialSkills.includes(skillId)) {
      throw new functions.https.HttpsError('failed-precondition', 'Material robot does not have the skill');
    }

    if (baseSkills.includes(skillId)) {
      throw new functions.https.HttpsError('already-exists', 'Base robot already has the skill');
    }

    if (baseSkills.length >= MAX_SKILLS) {
      throw new functions.https.HttpsError('failed-precondition', 'Base robot has reached the skill limit');
    }

    const success = Math.random() < INHERIT_SUCCESS_RATE;
    const nextSkills = success ? [...baseSkills, skillId] : baseSkills;

    if (success) {
      t.update(baseRef, {
        skills: nextSkills,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return { success, baseSkills: nextSkills };
  });

  return result;
});

// 購入API
export const purchaseItem = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const itemId = data?.itemId;
  const qty = data?.qty;

  if (typeof itemId !== "string" || typeof qty !== "number") {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
  }

  if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid quantity');
  }

  if (!isItemId(itemId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown item');
  }

  const userId = context.auth.uid;
  const userRef = admin.firestore().collection('users').doc(userId);
  const inventoryRef = userRef.collection('inventory').doc(itemId);
  const cost = ITEM_CATALOG[itemId].price * qty;

  const result = await admin.firestore().runTransaction(async (t) => {
    const userSnap = await t.get(userRef);
    const userData = userSnap.exists ? userSnap.data() : {};
    const credits = getUserCredits(userData);

    if (credits < cost) {
      throw new functions.https.HttpsError('failed-precondition', 'insufficient-funds');
    }

    const inventorySnap = await t.get(inventoryRef);
    const currentQty = inventorySnap.exists && typeof inventorySnap.data()?.qty === "number"
      ? inventorySnap.data()?.qty
      : 0;
    const newQty = currentQty + qty;
    const newCredits = credits - cost;

    t.set(userRef, { credits: newCredits }, { merge: true });
    t.set(inventoryRef, { itemId, qty: newQty }, { merge: true });

    return {
      credits: newCredits,
      inventoryDelta: { itemId, qty, totalQty: newQty }
    };
  });

  return result;
});

// 装備API
export const equipItem = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const robotId = data?.robotId;
  const slot = data?.slot;
  const rawItemId = data?.itemId;
  const itemId = typeof rawItemId === "string" && rawItemId.trim().length > 0
    ? rawItemId
    : undefined;

  if (typeof robotId !== "string" || (slot !== "slot1" && slot !== "slot2")) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
  }

  if (itemId && !isItemId(itemId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown item');
  }

  const slotKey = slot as "slot1" | "slot2";
  const userId = context.auth.uid;
  const userRef = admin.firestore().collection('users').doc(userId);
  const robotRef = userRef.collection('robots').doc(robotId);
  const inventoryCollection = userRef.collection('inventory');

  const result = await admin.firestore().runTransaction(async (t) => {
    const robotSnap = await t.get(robotRef);
    if (!robotSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Robot not found');
    }

    const robotData = robotSnap.data() as any;
    const equipped = (robotData.equipped ?? {}) as { slot1?: string | null; slot2?: string | null };
    const currentItem = equipped[slotKey] ?? null;
    const inventoryUpdates: Record<string, number> = {};

    if (!itemId) {
      if (!currentItem) {
        return { equipped, inventory: inventoryUpdates };
      }

      const returnRef = inventoryCollection.doc(currentItem);
      const returnSnap = await t.get(returnRef);
      const returnQty = returnSnap.exists && typeof returnSnap.data()?.qty === "number"
        ? returnSnap.data()?.qty
        : 0;
      const newReturnQty = returnQty + 1;

      t.set(returnRef, { itemId: currentItem, qty: newReturnQty }, { merge: true });
      t.update(robotRef, {
        [`equipped.${slotKey}`]: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      inventoryUpdates[currentItem] = newReturnQty;

      return { equipped: { ...equipped, [slotKey]: null }, inventory: inventoryUpdates };
    }

    if (itemId === currentItem) {
      return { equipped, inventory: inventoryUpdates };
    }

    const equipRef = inventoryCollection.doc(itemId);
    const equipSnap = await t.get(equipRef);
    const equipQty = equipSnap.exists && typeof equipSnap.data()?.qty === "number"
      ? equipSnap.data()?.qty
      : 0;

    if (equipQty < 1) {
      throw new functions.https.HttpsError('failed-precondition', 'insufficient-inventory');
    }

    const newEquipQty = equipQty - 1;
    t.set(equipRef, { itemId, qty: newEquipQty }, { merge: true });
    inventoryUpdates[itemId] = newEquipQty;

    if (currentItem) {
      const returnRef = inventoryCollection.doc(currentItem);
      const returnSnap = await t.get(returnRef);
      const returnQty = returnSnap.exists && typeof returnSnap.data()?.qty === "number"
        ? returnSnap.data()?.qty
        : 0;
      const newReturnQty = returnQty + 1;
      t.set(returnRef, { itemId: currentItem, qty: newReturnQty }, { merge: true });
      inventoryUpdates[currentItem] = newReturnQty;
    }

    const nextEquipped = { ...equipped, [slotKey]: itemId };
    t.update(robotRef, {
      [`equipped.${slotKey}`]: itemId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { equipped: nextEquipped, inventory: inventoryUpdates };
  });

  return result;
});
