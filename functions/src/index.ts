import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { randomInt } from "crypto";
import { assertRobotNotExists, assertValidBarcode, DuplicateRobotError, generateRobotFromBarcode, InvalidBarcodeError } from "./robotGenerator";
import { simulateBattle } from "./battleSystem";
import { GenerateRobotRequest, GenerateRobotResponse, VariantData, FighterRef } from "./types";
import { getRandomSkill, normalizeSkillIds } from "./skills";
import { SeededRandom } from "./seededRandom";
import { getWorkshopLines } from "./levelSystem";
import { generateVariantRecipe, resolveVariantStats, resolveVariantAppearance } from "./variantSystem";
import { applyBattleRewards, DAILY_CREDITS_CAP, levelFromXp } from "./battleRewards";
import { applyScanDailyAward, normalizeScanDaily, normalizeScanTokens, SCAN_TOKEN_PER_SCAN } from "./scanTokens";
import { applyCraftBalances, getCraftCosts, isCraftItemId } from "./crafting";
import { resolveEntryFee } from "./battleEntryFee";
import { buildLedgerEntry } from "./ledger";
import { getJstDateKey, getYesterdayJstDateKey } from "./dateKey";
import { resolveDailyLogin } from "./dailyLogin";
// Node.js 20 has native fetch - no need for node-fetch


// Use a version constant to help track deployments and identify cache issues
const VERSION = "2.1.0-fixed-cors-v3";

// Simple test function to verify Cloud Functions are working
export const testFunctionHealth = functions
  .runWith({ memory: '128MB', timeoutSeconds: 10 })
  .https.onCall(async (_data, context) => {
    console.log(`[${VERSION}] testFunctionHealth called`, { hasAuth: !!context.auth });
    return {
      status: 'ok',
      version: VERSION,
      timestamp: new Date().toISOString(),
      hasAuth: !!context.auth,
      nodeVersion: process.version,
    };
  });

// New debug function to test basic connectivity without complex logic
export const debugPing = functions
  .runWith({ memory: '128MB', timeoutSeconds: 5 })
  .https.onCall(async (data, context) => {
    console.log(`[${VERSION}] debugPing (Callable) called`, { data });
    return {
      message: "pong",
      version: VERSION,
      timestamp: new Date().toISOString(),
      echo: data
    };
  });

// HTTP version of debugPing for easy browser testing (preflight check)
export const ping = functions
  .runWith({ memory: '128MB', timeoutSeconds: 5 })
  .https.onRequest((req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    res.status(200).send({
      status: 'ok',
      message: 'pong',
      version: VERSION,
      timestamp: new Date().toISOString()
    });
  });

// Force rebuild: 2025-12-29T03:18:00
admin.initializeApp();

const ITEM_CATALOG = {
  power_core: { price: 100 },
  shield_plate: { price: 80 },
  speed_chip: { price: 60 }
} as const;

type ItemId = keyof typeof ITEM_CATALOG;

const isItemId = (itemId: string): itemId is ItemId => {
  return Object.prototype.hasOwnProperty.call(ITEM_CATALOG, itemId);
};

const LOGIN_BONUS_CREDITS = 50;
const DAILY_MISSIONS = [
  { id: "scan_barcode", title: "Scan 1 barcode", target: 1, rewardCredits: 30 },
  { id: "win_battle", title: "Win 1 battle", target: 1, rewardCredits: 40 },
  { id: "synthesize", title: "Synthesize 1 robot", target: 1, rewardCredits: 50 }
];

const buildDailyMissions = () => {
  return DAILY_MISSIONS.map((mission) => ({
    ...mission,
    progress: 0,
    claimed: false
  }));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-expect-error - Kept for potential future use
const _updateMissionProgressInternal = async (
  t: admin.firestore.Transaction,
  userRef: admin.firestore.DocumentReference,
  dateKey: string,
  missionId: string,
  increment: number = 1
) => {
  const missionsRef = userRef.collection("missions").doc(dateKey);
  const missionSnap = await t.get(missionsRef);
  let missions: any[];
  if (!missionSnap.exists) {
    missions = buildDailyMissions();
  } else {
    const data = missionSnap.data();
    missions = (data && Array.isArray(data.missions)) ? data.missions : buildDailyMissions();
  }

  const updatedMissions = missions.map((m: any) => {
    if (m.id === missionId && !m.claimed) {
      const currentProgress = typeof m.progress === "number" ? m.progress : 0;
      return { ...m, progress: Math.min(m.target || 1, currentProgress + increment) };
    }
    return m;
  });

  t.set(missionsRef, {
    missions: updatedMissions,
    dateKey,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
};

// Write-only version for when missions data is already fetched
const writeMissionProgress = (
  t: admin.firestore.Transaction,
  missionsRef: admin.firestore.DocumentReference,
  dateKey: string,
  missionId: string,
  existingMissions: any[] | undefined,
  increment: number = 1
) => {
  const missions = (existingMissions && Array.isArray(existingMissions))
    ? existingMissions
    : buildDailyMissions();

  const updatedMissions = missions.map((m: any) => {
    if (m.id === missionId && !m.claimed) {
      const currentProgress = typeof m.progress === "number" ? m.progress : 0;
      return { ...m, progress: Math.min(m.target || 1, currentProgress + increment) };
    }
    return m;
  });

  t.set(missionsRef, {
    missions: updatedMissions,
    dateKey,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
};


const getUserCredits = (user: any): number => {
  const credits = user?.credits ?? 0;
  return typeof credits === "number" ? credits : 0;
};

// ロボット生成API
const FREE_DAILY_LIMIT = 100; // Temporarily increased for testing (was 1)
const PREMIUM_DAILY_LIMIT = 10;

export const generateRobot = functions.https.onCall(async (data: GenerateRobotRequest, context): Promise<GenerateRobotResponse> => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { barcode } = data ?? {};

  // バリデーション
  if (!barcode || typeof barcode !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a valid barcode.'
    );
  }

  try {
    const userId = context.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const robotRef = userRef.collection('robots').doc(barcode);
    const todayKey = getJstDateKey();
    const scanDailyRef = userRef.collection('scanDaily').doc(todayKey);

    // ロボットデータ生成
    const robotData = generateRobotFromBarcode(barcode, userId);

    await db.runTransaction(async (t) => {
      const missionsRef = userRef.collection('missions').doc(todayKey);
      const [userSnap, scanDailySnap, robotSnap, missionsSnap] = await Promise.all([
        t.get(userRef),
        t.get(scanDailyRef),
        t.get(robotRef),
        t.get(missionsRef)
      ]);
      const userData = userSnap.exists ? userSnap.data() : {};
      const existingMissions = missionsSnap.exists ? missionsSnap.data()?.missions : undefined;

      const isPremium = !!userData?.isPremium;
      const lastGenDate = userData?.lastGenerationDateKey;
      const currentDailyCount = (lastGenDate === todayKey) ? (userData?.dailyGenerationCount || 0) : 0;
      const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

      if (currentDailyCount >= limit) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          isPremium
            ? `Premium limit reached (${PREMIUM_DAILY_LIMIT}/day). Come back tomorrow!`
            : `Free limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Premium for ${PREMIUM_DAILY_LIMIT}/day!`
        );
      }

      assertRobotNotExists(robotSnap.exists);

      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
      const scanDailyState = normalizeScanDaily(scanDailySnap.exists ? scanDailySnap.data() : {});
      const scanAward = applyScanDailyAward(scanDailyState, barcode);
      const scanTokenIncrement = scanAward.awarded ? SCAN_TOKEN_PER_SCAN : 0;

      t.set(robotRef, {
        ...robotData,
        id: robotRef.id,
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp
      });

      t.set(userRef, {
        totalRobots: admin.firestore.FieldValue.increment(1),
        credits: admin.firestore.FieldValue.increment(0),
        scanTokens: admin.firestore.FieldValue.increment(scanTokenIncrement),
        lastGenerationDateKey: todayKey,
        dailyGenerationCount: currentDailyCount + 1,
        updatedAt: serverTimestamp
      }, { merge: true });

      if (scanAward.awarded) {
        t.set(scanDailyRef, {
          dateKey: todayKey,
          issuedCount: scanAward.nextState.issuedCount,
          updatedAt: serverTimestamp,
          [`barcodes.${barcode}`]: true
        }, { merge: true });

        const ledgerRef = userRef.collection('ledger').doc();
        t.set(ledgerRef, {
          ...buildLedgerEntry({
            type: "SCAN",
            deltaScanTokens: scanTokenIncrement,
            refId: `${todayKey}:${barcode}`
          }),
          createdAt: serverTimestamp
        });
      }

      // Daily Mission: Scan Barcode
      writeMissionProgress(t, missionsRef, todayKey, "scan_barcode", existingMissions);
    });

    return {
      robotId: robotRef.id,
      robot: {
        ...robotData,
        id: robotRef.id
      },
      version: VERSION
    };

  } catch (error) {
    console.error("Error generating robot:", error);
    if (error instanceof InvalidBarcodeError) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with a valid barcode.'
      );
    }
    if (error instanceof DuplicateRobotError) {
      throw new functions.https.HttpsError(
        'already-exists',
        'You already have a robot from this barcode.'
      );
    }
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while generating the robot.'
    );
  }
});

// ScanToken issuance (daily per barcode)
export const awardScanToken = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const barcode = data?.barcode;
  if (typeof barcode !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid barcode');
  }

  try {
    assertValidBarcode(barcode);
  } catch (_error) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid barcode');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  const dateKey = getJstDateKey();
  const scanDailyRef = userRef.collection('scanDaily').doc(dateKey);

  try {
    const result = await db.runTransaction(async (t) => {
      const [userSnap, scanDailySnap] = await Promise.all([
        t.get(userRef),
        t.get(scanDailyRef)
      ]);

      if (!userSnap.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'User not found');
      }

      const userData = userSnap.data() || {};
      const scanDailyState = normalizeScanDaily(scanDailySnap.exists ? scanDailySnap.data() : {});
      const scanAward = applyScanDailyAward(scanDailyState, barcode);

      if (!scanAward.awarded) {
        throw new functions.https.HttpsError('already-exists', 'Scan token already issued');
      }

      const currentTokens = normalizeScanTokens(userData.scanTokens);
      const nextTokens = currentTokens + SCAN_TOKEN_PER_SCAN;
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

      t.set(scanDailyRef, {
        dateKey,
        issuedCount: scanAward.nextState.issuedCount,
        updatedAt: serverTimestamp,
        [`barcodes.${barcode}`]: true
      }, { merge: true });

      t.set(userRef, {
        scanTokens: nextTokens,
        updatedAt: serverTimestamp
      }, { merge: true });

      const ledgerRef = userRef.collection('ledger').doc();
      t.set(ledgerRef, {
        ...buildLedgerEntry({
          type: "SCAN",
          deltaScanTokens: SCAN_TOKEN_PER_SCAN,
          refId: `${dateKey}:${barcode}`
        }),
        createdAt: serverTimestamp
      });

      return {
        awarded: true,
        dateKey,
        barcode,
        scanTokensBalance: nextTokens
      };
    });

    return result;
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error("awardScanToken error:", error);
    throw new functions.https.HttpsError('internal', 'Failed to award scan token');
  }
});

// レア度に応じたクレジット変換レート
const RARITY_CREDIT_VALUE: Record<string, number> = {
  'Common': 10,
  'Rare': 30,
  'Epic': 100,
  'Legendary': 500,
};

// 一括分解API
export const batchDisassemble = functions.https.onCall(async (data: { robotIds: string[] }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { robotIds } = data;
  if (!Array.isArray(robotIds) || robotIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'robotIds must be a non-empty array');
  }

  if (robotIds.length > 50) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot disassemble more than 50 robots at once');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();

  try {
    let totalCredits = 0;
    let deletedCount = 0;

    await db.runTransaction(async (transaction) => {
      const robotRefs = robotIds.map(id =>
        db.collection('users').doc(userId).collection('robots').doc(id)
      );

      // Fetch all robots to validate and calculate credits
      const robotSnaps = await Promise.all(robotRefs.map(ref => transaction.get(ref)));

      for (const snap of robotSnaps) {
        if (snap.exists) {
          const robotData = snap.data();
          const rarityName = robotData?.rarityName || 'Common';
          const creditValue = RARITY_CREDIT_VALUE[rarityName] || 10;
          totalCredits += creditValue;
          deletedCount++;
          transaction.delete(snap.ref);
        }
      }

      // Update user credits
      if (totalCredits > 0) {
        const userRef = db.collection('users').doc(userId);
        transaction.update(userRef, {
          credits: admin.firestore.FieldValue.increment(totalCredits)
        });
      }
    });

    return {
      creditsGained: totalCredits,
      robotsDeleted: deletedCount
    };
  } catch (error) {
    console.error('batchDisassemble error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to disassemble robots');
  }
});

// ============================================
// 進化API (Evolution)
// ============================================
const EVOLUTION_STAT_MULTIPLIER = 1.1; // 10% boost per evolution level

// Helper to get family from barcode (client-side backward compat)
const getFamilyFromBarcode = (barcode: string): number => {
  const d0 = parseInt(barcode[0], 10) || 0;
  const d1 = parseInt(barcode[1], 10) || 0;
  return ((d0 + d1) % 5) + 1;
};

export const evolveRobot = functions.https.onCall(async (data: { targetBarcode: string, materialBarcodes: string[] }, context) => {
  // 1. Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'ログインしてください');
  }

  const { targetBarcode, materialBarcodes } = data ?? {};

  // 2. Validate input types
  if (typeof targetBarcode !== 'string' || !Array.isArray(materialBarcodes)) {
    throw new functions.https.HttpsError('invalid-argument', '入力が不正です');
  }

  // 3. Validate 13-digit barcodes
  const barcodePattern = /^\d{13}$/;
  if (!barcodePattern.test(targetBarcode)) {
    throw new functions.https.HttpsError('invalid-argument', '入力が不正です');
  }

  // 4. Validate materialBarcodes: exactly 2, unique, not target
  if (materialBarcodes.length !== 2) {
    throw new functions.https.HttpsError('invalid-argument', '素材は2体必要です');
  }

  for (const mb of materialBarcodes) {
    if (typeof mb !== 'string' || !barcodePattern.test(mb)) {
      throw new functions.https.HttpsError('invalid-argument', '入力が不正です');
    }
  }

  if (materialBarcodes[0] === materialBarcodes[1]) {
    throw new functions.https.HttpsError('invalid-argument', '同じロボットを2回選択できません');
  }

  if (materialBarcodes.includes(targetBarcode)) {
    throw new functions.https.HttpsError('invalid-argument', 'ターゲットを素材にはできません');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();
  const robotsRef = db.collection('users').doc(userId).collection('robots');

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 5. Get all 3 robots
      const targetRef = robotsRef.doc(targetBarcode);
      const material1Ref = robotsRef.doc(materialBarcodes[0]);
      const material2Ref = robotsRef.doc(materialBarcodes[1]);

      const [targetSnap, mat1Snap, mat2Snap] = await Promise.all([
        transaction.get(targetRef),
        transaction.get(material1Ref),
        transaction.get(material2Ref)
      ]);

      // 6. Check existence
      if (!targetSnap.exists) {
        throw new functions.https.HttpsError('not-found', '対象ロボが見つかりません');
      }
      if (!mat1Snap.exists || !mat2Snap.exists) {
        throw new functions.https.HttpsError('not-found', '素材ロボが見つかりません');
      }

      const targetData = targetSnap.data()!;
      const mat1Data = mat1Snap.data()!;
      const mat2Data = mat2Snap.data()!;

      // 7. Check ownership (all should belong to user)
      if (targetData.userId !== userId || mat1Data.userId !== userId || mat2Data.userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', '権限がありません');
      }

      // 8. Check family match (use stored family or compute from barcode)
      const targetFamily = targetData.family ?? getFamilyFromBarcode(targetBarcode);
      const mat1Family = mat1Data.family ?? getFamilyFromBarcode(materialBarcodes[0]);
      const mat2Family = mat2Data.family ?? getFamilyFromBarcode(materialBarcodes[1]);

      if (mat1Family !== targetFamily || mat2Family !== targetFamily) {
        throw new functions.https.HttpsError('failed-precondition', '同じカテゴリの素材を選んでください');
      }

      // 9. Calculate new stats
      const currentEvolutionLevel = typeof targetData.evolutionLevel === 'number' ? targetData.evolutionLevel : 0;
      const newEvolutionLevel = currentEvolutionLevel + 1;

      const newBaseHp = Math.floor((targetData.baseHp || 100) * EVOLUTION_STAT_MULTIPLIER);
      const newBaseAttack = Math.floor((targetData.baseAttack || 10) * EVOLUTION_STAT_MULTIPLIER);
      const newBaseDefense = Math.floor((targetData.baseDefense || 10) * EVOLUTION_STAT_MULTIPLIER);
      const newBaseSpeed = Math.floor((targetData.baseSpeed || 10) * EVOLUTION_STAT_MULTIPLIER);

      // 10. Update target
      transaction.update(targetRef, {
        evolutionLevel: newEvolutionLevel,
        baseHp: newBaseHp,
        baseAttack: newBaseAttack,
        baseDefense: newBaseDefense,
        baseSpeed: newBaseSpeed,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 11. Delete materials
      transaction.delete(material1Ref);
      transaction.delete(material2Ref);

      // 12. Decrement user's totalRobots
      const userRef = db.collection('users').doc(userId);
      transaction.update(userRef, {
        totalRobots: admin.firestore.FieldValue.increment(-2),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        evolutionLevel: newEvolutionLevel,
        newStats: {
          baseHp: newBaseHp,
          baseAttack: newBaseAttack,
          baseDefense: newBaseDefense,
          baseSpeed: newBaseSpeed
        }
      };
    });

    return result;
  } catch (error) {
    console.error('evolveRobot error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'サーバーエラー');
  }
});

// ============================================
// Vision API REST Implementation (No SDK)
// ============================================
// SDK was causing load-time crashes, so we use REST API directly.

// Vision API helpers removed

// Vision API implementation removed in favor of Gemini API

// バトル開始API
const MATERIAL_MAX_COUNT = 5;
const MATERIAL_LEVEL_XP = 25;
const LEVEL_XP = 100;
const INHERIT_SUCCESS_RATE = 0.35;
const MAX_SKILLS = 4;
const K_FACTOR = 32;

const getRobotXp = (robot: any): number => {
  const xp = robot?.xp ?? robot?.exp ?? robot?.experience ?? 0;
  return typeof xp === "number" ? xp : 0;
};

// ELOレーティング期待勝率計算
const expectedWinRate = (playerRating: number, opponentRating: number): number => {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
};

// レーティング変動計算
const calculateRatingChange = (
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw'
): number => {
  const expected = expectedWinRate(playerRating, opponentRating);
  let actual: number;
  if (result === 'win') actual = 1.0;
  else if (result === 'loss') actual = 0.0;
  else actual = 0.5;
  return Math.round(K_FACTOR * (actual - expected));
};

// 対戦相手検索
const findOpponent = async (db: admin.firestore.Firestore, playerId: string, playerRating: number) => {
  // ランキング±100以内を検索
  const opponents = await db
    .collection('users')
    .where('rankingPoints', '>=', playerRating - 100)
    .where('rankingPoints', '<=', playerRating + 100)
    .limit(20)
    .get();

  // 自分を除外
  const candidates = opponents.docs
    .filter(doc => doc.id !== playerId)
    .map(doc => ({ uid: doc.id, ...doc.data() }));

  if (candidates.length === 0) {
    // 該当者なし → CPU生成
    const cpuRobot = generateRobotFromBarcode(String(Math.floor(Math.random() * 1e13)).padStart(13, '0'), 'cpu');
    return {
      isCPU: true,
      user: {
        uid: 'cpu',
        username: 'CPU',
        rankingPoints: 1000
      },
      robot: cpuRobot
    };
  }

  // ランダム選択
  const rng = new SeededRandom(Date.now().toString());
  const selectedUser = candidates[rng.nextInt(0, candidates.length - 1)];

  // 選択されたユーザーの最強ロボット取得
  const robotsSnap = await db
    .collection('users').doc(selectedUser.uid as string)
    .collection('robots')
    .orderBy('totalWins', 'desc')
    .limit(1)
    .get();

  let robot;
  if (robotsSnap.empty) {
    // ロボットを持っていない場合はCPUロボットを使用
    robot = generateRobotFromBarcode(String(Math.floor(Math.random() * 1e13)).padStart(13, '0'), selectedUser.uid as string);
  } else {
    robot = robotsSnap.docs[0].data();
  }

  return {
    isCPU: false,
    user: selectedUser,
    robot
  };
};

const BATTLE_ITEM_IDS = ['repair_kit', 'attack_boost', 'defense_boost', 'critical_lens'];
const PRE_BATTLE_ITEM_TYPES = ['BOOST', 'SHIELD', 'JAMMER', 'DISRUPT', 'CANCEL_CRIT'] as const;
type PreBattleItemType = typeof PRE_BATTLE_ITEM_TYPES[number];

const normalizePreBattleItem = (item?: string | null): PreBattleItemType | null => {
  if (!item) return null;
  if (item === 'CANCEL_CRIT' || item === 'DISRUPT') return 'JAMMER';
  return PRE_BATTLE_ITEM_TYPES.includes(item as PreBattleItemType) ? (item as PreBattleItemType) : null;
};

const stripItemFields = (log: Record<string, any>) => {
  const { itemApplied, itemSide, itemType, itemEffect, itemEvent, itemMessage, ...rest } = log;
  // Remove undefined values to prevent Firestore errors
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const matchBattle = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { playerRobotId, useItemId, cheer, battleItems, fighterRef, specialInput } = data;
  const pFighterRef = fighterRef || { kind: 'robot', id: playerRobotId };
  const userId = context.auth.uid;
  const db = admin.firestore();

  // アイテムID検証
  if (useItemId && !BATTLE_ITEM_IDS.includes(useItemId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid battle item');
  }

  const normalizedBattleItem = normalizePreBattleItem(battleItems?.p1);
  if (battleItems?.p1 && !normalizedBattleItem) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid P1 battle item type');
  }

  try {
    // 1. プレイヤーロボット取得
    const playerRobot = await resolveFighterData(userId, pFighterRef);

    // 2. プレイヤー情報取得（ランキングポイント）
    const playerSnap = await db.collection('users').doc(userId).get();
    const player = playerSnap.data() || {};
    const playerRating = typeof player.rankingPoints === 'number' ? player.rankingPoints : 1000;
    const currentWinStreak = typeof player.currentWinStreak === 'number' ? player.currentWinStreak : 0;
    const playerLevel = typeof player.level === "number"
      ? player.level
      : levelFromXp(typeof player.xp === "number" ? player.xp : 0);

    if (normalizedBattleItem && playerLevel < 5) {
      throw new functions.https.HttpsError('failed-precondition', 'item-slots-locked');
    }

    // アイテム所持事前チェック（UXのため。厳密なチェックはトランザクション内で）
    if (useItemId) {
      const itemSnap = await db.collection('users').doc(userId).collection('inventory').doc(useItemId).get();
      const qty = itemSnap.data()?.qty ?? 0;
      if (qty < 1) {
        throw new functions.https.HttpsError('failed-precondition', 'Item not in inventory');
      }
    }

    // Pre-battle item inventory check (UX only; strict check in transaction)
    if (normalizedBattleItem) {
      const inventoryCollection = db.collection('users').doc(userId).collection('inventory');
      if (normalizedBattleItem === 'JAMMER') {
        const jammerSnap = await inventoryCollection.doc('JAMMER').get();
        const jammerQty = jammerSnap.data()?.qty ?? 0;
        if (jammerQty < 1) {
          const disruptSnap = await inventoryCollection.doc('DISRUPT').get();
          const disruptQty = disruptSnap.data()?.qty ?? 0;
          if (disruptQty < 1) {
            const legacySnap = await inventoryCollection.doc('CANCEL_CRIT').get();
            const legacyQty = legacySnap.data()?.qty ?? 0;
            if (legacyQty < 1) {
              throw new functions.https.HttpsError('failed-precondition', 'Item not in inventory');
            }
          }
        }
      } else {
        const itemSnap = await inventoryCollection.doc(normalizedBattleItem).get();
        const qty = itemSnap.data()?.qty ?? 0;
        if (qty < 1) {
          throw new functions.https.HttpsError('failed-precondition', 'Item not in inventory');
        }
      }
    }

    // 3. 対戦相手選択
    const opponent = await findOpponent(db, userId, playerRating);
    const opponentRobot = { ...opponent.robot, id: opponent.robot.id || 'opponent_robot' };

    // 4. バトル実行
    const battleId = db.collection('battles').doc().id;
    const playerItems = useItemId ? [useItemId] : [];
    // Pass cheer input: p1 = player, p2 = opponent
    const cheerInput = cheer ? { p1: !!cheer.p1, p2: !!cheer.p2 } : undefined;
    // Pass battle items: p1 = player, p2 = opponent (opponent doesn't use items in PvE)
    const battleItemInput = normalizedBattleItem ? { p1: normalizedBattleItem, p2: null } : undefined;
    // Pass special move input: p1 = player, p2 = opponent (opponent doesn't use specials in PvE)
    const specialMoveInput = specialInput ? { p1Used: !!specialInput.p1Used, p2Used: false } : undefined;
    const battleResult = simulateBattle(playerRobot as any, opponentRobot as any, battleId, playerItems, cheerInput, battleItemInput, specialMoveInput);
    const publicLogs = battleResult.logs.map(stripItemFields);

    // 勝敗判定
    const winnerIsPlayer = battleResult.winnerId === playerRobot.id;
    const winnerIsOpponent = battleResult.winnerId === opponentRobot.id;
    const resultType = winnerIsPlayer ? 'win' : winnerIsOpponent ? 'loss' : 'draw';

    // 5. ランキングポイント計算
    const opponentUser = opponent.user as any;
    const opponentRating = typeof opponentUser.rankingPoints === 'number' ? opponentUser.rankingPoints : 1000;
    let ratingChange = calculateRatingChange(playerRating, opponentRating, resultType);

    // 連勝ボーナス
    if (winnerIsPlayer && currentWinStreak >= 3) {
      ratingChange = Math.round(ratingChange * 1.2);
    }

    // BOT戦は半分
    if (opponent.isCPU) {
      ratingChange = Math.round(ratingChange * 0.5);
    }

    // 6. 報酬計算
    const winnerUid = winnerIsPlayer ? userId : null;

    // 7. Firestore更新（トランザクション）
    const txnReward = await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const battleRef = db.collection('battles').doc(battleId);
      const battleResultRef = userRef.collection('battleResults').doc(battleId);

      const [userSnap, battleSnap, battleResultSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(battleRef),
        transaction.get(battleResultRef)
      ]);
      if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found in transaction');
      const userData = userSnap.data() || {};
      const userLevel = typeof userData.level === "number"
        ? userData.level
        : levelFromXp(typeof userData.xp === "number" ? userData.xp : 0);

      if (normalizedBattleItem && userLevel < 5) {
        throw new functions.https.HttpsError('failed-precondition', 'item-slots-locked');
      }

      if (battleResultSnap.exists || (battleSnap.exists && battleSnap.data()?.rewardGranted)) {
        const fallbackXp = typeof userData.xp === "number" ? userData.xp : 0;
        const fallbackLevel = typeof userData.level === "number" ? userData.level : 1;
        const battleData = battleSnap.exists ? (battleSnap.data() as Record<string, any>) : {};
        const existingReward = battleData?.reward ?? {
          creditsReward: 0,
          xpReward: 0,
          scanTokensGained: 0,
          xpBefore: fallbackXp,
          xpAfter: fallbackXp,
          levelBefore: fallbackLevel,
          levelAfter: fallbackLevel,
          dailyCapApplied: false,
          dailyCreditsCapApplied: false,
          capped: false,
          capRemaining: DAILY_CREDITS_CAP,
          reason: null,
        };
        const resolvedLevelAfter = typeof existingReward.levelAfter === "number" ? existingReward.levelAfter : fallbackLevel;
        const resolvedLevelBefore = typeof existingReward.levelBefore === "number" ? existingReward.levelBefore : fallbackLevel;
        return {
          reward: existingReward,
          earnedCredits: existingReward.creditsReward ?? 0,
          earnedXp: existingReward.xpReward ?? 0,
          scanTokensGained: existingReward.scanTokensGained ?? 0,
          leveledUp: resolvedLevelAfter > resolvedLevelBefore,
          newWorkshopLines: getWorkshopLines(resolvedLevelAfter),
        };
      }

      const entryFeeState = resolveEntryFee({
        credits: getUserCredits(userData),
        entryFeeCharged: battleSnap.exists && battleSnap.data()?.entryFeeCharged === true,
      });
      if (entryFeeState.insufficient) {
        throw new functions.https.HttpsError('failed-precondition', 'insufficient-credits');
      }
      const entryFeeCharged = entryFeeState.charged;
      const entryFeeAmount = entryFeeCharged ? entryFeeState.fee : 0;

      const todayKey = getJstDateKey();
      const rewardResult = applyBattleRewards({
        battleData: { status: "completed", winner: resultType },
        userData,
        userId,
        winnerUid,
        todayKey,
        dailyCreditsCap: DAILY_CREDITS_CAP,
      });

      const earnedCredits = rewardResult.reward.creditsReward;
      const earnedXp = rewardResult.reward.xpReward;
      const scanTokensGained = rewardResult.reward.scanTokensGained ?? 0;
      const leveledUp = rewardResult.reward.levelAfter > rewardResult.reward.levelBefore;
      const newWorkshopLines = getWorkshopLines(rewardResult.levelAfter);

      // Pre-battle item consumption (inventory only)
      if (normalizedBattleItem) {
        const inventoryCollection = userRef.collection('inventory');
        let consumeRef = inventoryCollection.doc(normalizedBattleItem);
        const itemDoc = await transaction.get(consumeRef);
        let availableQty = itemDoc.data()?.qty ?? 0;

        if (availableQty < 1 && normalizedBattleItem === 'JAMMER') {
          const fallbackIds = ['DISRUPT', 'CANCEL_CRIT'];
          for (const fallbackId of fallbackIds) {
            const fallbackRef = inventoryCollection.doc(fallbackId);
            const fallbackDoc = await transaction.get(fallbackRef);
            const fallbackQty = fallbackDoc.data()?.qty ?? 0;
            if (fallbackQty > 0) {
              consumeRef = fallbackRef;
              availableQty = fallbackQty;
              break;
            }
          }
        }

        if (availableQty < 1) {
          throw new functions.https.HttpsError('failed-precondition', 'Item not in inventory');
        }

        transaction.update(consumeRef, {
          qty: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // アイテム消費
      if (useItemId) {
        const itemRef = db.collection('users').doc(userId).collection('inventory').doc(useItemId);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists || (itemDoc.data()?.qty ?? 0) < 1) {
          throw new functions.https.HttpsError('failed-precondition', 'Item not in inventory');
        }

        transaction.update(itemRef, {
          qty: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // バトル結果保存
      transaction.set(battleRef, {
        id: battleId,
        playerId: userId,
        playerUsername: player.username || 'Unknown',
        playerRobotId: playerRobot.id,
        playerRobotSnapshot: playerRobot,
        opponentId: opponent.user.uid,
        opponentUsername: opponentUser.username,
        opponentRobotSnapshot: opponentRobot,
        winner: resultType === 'win' ? 'player' : resultType === 'loss' ? 'opponent' : 'draw',
        turnCount: battleResult.turnCount || battleResult.logs.length,
        totalDamageP1: battleResult.totalDamageP1,
        totalDamageP2: battleResult.totalDamageP2,
        playerFinalHp: 0,
        opponentFinalHp: 0,
        experienceGained: earnedXp,
        rankingPointsChange: ratingChange,
        battleLog: publicLogs,
        rewards: {
          credits: earnedCredits,
          xp: earnedXp,
          exp: earnedXp,
          coins: earnedCredits,
          dailyCapApplied: rewardResult.reward.dailyCapApplied,
          dailyCreditsCapApplied: rewardResult.reward.dailyCreditsCapApplied,
          levelUp: leveledUp,
          newLevel: rewardResult.reward.levelAfter,
          newWorkshopLines,
          capped: rewardResult.reward.capped,
          capRemaining: rewardResult.reward.capRemaining,
          reason: rewardResult.reward.reason,
          creditsReward: rewardResult.reward.creditsReward,
          xpReward: rewardResult.reward.xpReward,
          scanTokensGained: rewardResult.reward.scanTokensGained ?? 0,
          xpBefore: rewardResult.reward.xpBefore,
          xpAfter: rewardResult.reward.xpAfter,
          levelBefore: rewardResult.reward.levelBefore,
          levelAfter: rewardResult.reward.levelAfter
        },
        entryFeeCharged,
        rewardGranted: rewardResult.granted,
        reward: rewardResult.reward,
        rewardGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        duration: 0
      });

      // User Battle Result (Idempotency)
      transaction.set(battleResultRef, {
        battleId,
        userId,
        result: resultType,
        creditsEarned: earnedCredits,
        xpEarned: earnedXp,
        scanTokensGained,
        battleLog: publicLogs,
        battleItems: battleItemInput ?? null,
        entryFeeCharged,
        reward: rewardResult.reward,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // プレイヤー統計更新
      const playerUpdates: any = {
        level: rewardResult.levelAfter,
        xp: rewardResult.xpAfter,
        workshopLines: newWorkshopLines,
        totalBattles: admin.firestore.FieldValue.increment(1),
        rankingPoints: admin.firestore.FieldValue.increment(ratingChange),
        credits: admin.firestore.FieldValue.increment(earnedCredits - entryFeeAmount),
        scanTokens: admin.firestore.FieldValue.increment(scanTokensGained),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (rewardResult.dailyBattleDateKey) {
        playerUpdates.dailyBattleDateKey = rewardResult.dailyBattleDateKey;
        playerUpdates.dailyBattleCreditsEarned = rewardResult.dailyBattleCreditsEarned ?? 0;
        playerUpdates.dailyBattleXpEarned = rewardResult.dailyBattleXpEarned ?? 0;
      }

      if (winnerIsPlayer) {
        playerUpdates.totalWins = admin.firestore.FieldValue.increment(1);
        playerUpdates.currentWinStreak = admin.firestore.FieldValue.increment(1);

        // NOTE: Mission update moved outside transaction to avoid read-after-write violation
        // See post-transaction mission update below
      } else if (winnerIsOpponent) {
        playerUpdates.totalLosses = admin.firestore.FieldValue.increment(1);
        playerUpdates.currentWinStreak = 0;
      } else {
        playerUpdates.totalDraws = admin.firestore.FieldValue.increment(1);
      }

      transaction.update(userRef, playerUpdates);

      // ロボット統計更新
      const currentExp = getRobotXp(playerRobot) + earnedXp;
      const currentLevel = playerRobot.level || 1;
      const expToNextLevel = currentLevel * 100;

      let robotUpdates: any = {
        xp: currentExp,
        totalBattles: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (winnerIsPlayer) {
        robotUpdates.wins = admin.firestore.FieldValue.increment(1);
        robotUpdates.totalWins = admin.firestore.FieldValue.increment(1);
      } else if (winnerIsOpponent) {
        robotUpdates.losses = admin.firestore.FieldValue.increment(1);
        robotUpdates.totalLosses = admin.firestore.FieldValue.increment(1);
      }

      // Level Up Logic (battle engine now applies level scaling dynamically)
      if (currentExp >= expToNextLevel) {
        const newLevel = currentLevel + 1;
        robotUpdates.level = newLevel;
        // NOTE: Base stats are no longer modified here.
        // Battle system uses getLevelMultiplier() for level-scaled effective stats.

        // Skill Acquisition
        if ([3, 5, 10].includes(newLevel)) {
          const newSkill = getRandomSkill();
          const currentSkills = normalizeSkillIds(playerRobot.skills);
          if (!currentSkills.includes(newSkill.id) && currentSkills.length < 4) {
            currentSkills.push(newSkill.id);
            robotUpdates.skills = currentSkills;
            battleResult.rewards.newSkill = newSkill.name;
          }
        }
      }

      if (!playerRobot.isVariant) {
        transaction.update(
          db.collection('users').doc(userId).collection('robots').doc(playerRobot.id),
          robotUpdates
        );
      }

      return {
        reward: rewardResult.reward,
        earnedCredits,
        earnedXp,
        scanTokensGained,
        leveledUp,
        newWorkshopLines,
        winnerIsPlayer
      };
    });

    // Post-transaction mission update (non-transactional to avoid read-after-write violation)
    if (txnReward?.winnerIsPlayer) {
      try {
        const postTxnTodayKey = getJstDateKey();
        const missionsRef = db.collection('users').doc(userId).collection('missions').doc(postTxnTodayKey);
        const missionSnap = await missionsRef.get();
        let missions = buildDailyMissions();
        if (missionSnap.exists) {
          const data = missionSnap.data();
          missions = (data && Array.isArray(data.missions)) ? data.missions : missions;
        }
        const updatedMissions = missions.map((m: any) => {
          if (m.id === 'win_battle' && !m.claimed) {
            const currentProgress = typeof m.progress === 'number' ? m.progress : 0;
            return { ...m, progress: Math.min(m.target || 1, currentProgress + 1) };
          }
          return m;
        });
        await missionsRef.set({
          missions: updatedMissions,
          dateKey: postTxnTodayKey,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (missionError) {
        console.error('Mission update failed (non-critical):', missionError);
        // Non-critical failure - don't throw
      }
    }

    return {
      battleId,
      resolvedPlayerRobot: playerRobot,
      result: {
        winner: resultType === 'win' ? 'player' : resultType === 'loss' ? 'opponent' : 'draw',
        log: battleResult.logs,
      },
      experienceGained: txnReward?.earnedXp ?? 0,
      rankingPointsChange: ratingChange,
      rewards: {
        exp: txnReward?.earnedXp ?? 0,
        credits: txnReward?.earnedCredits ?? 0,
        xp: txnReward?.earnedXp ?? 0,
        coins: txnReward?.earnedCredits ?? 0,
        creditsReward: txnReward?.reward?.creditsReward ?? 0,
        xpReward: txnReward?.reward?.xpReward ?? 0,
        scanTokensGained: txnReward?.reward?.scanTokensGained ?? 0,
        xpBefore: txnReward?.reward?.xpBefore ?? 0,
        xpAfter: txnReward?.reward?.xpAfter ?? 0,
        levelBefore: txnReward?.reward?.levelBefore ?? 1,
        levelAfter: txnReward?.reward?.levelAfter ?? 1,
        capped: txnReward?.reward?.capped ?? false,
        capRemaining: txnReward?.reward?.capRemaining,
        reason: txnReward?.reward?.reason ?? null,
        dailyCapApplied: txnReward?.reward?.dailyCapApplied ?? false,
        dailyCreditsCapApplied: txnReward?.reward?.dailyCreditsCapApplied ?? false,
        levelUp: txnReward?.leveledUp ?? false,
        newLevel: txnReward?.reward?.levelAfter ?? 1,
        newWorkshopLines: txnReward?.newWorkshopLines
      }
    };

  } catch (error) {
    console.error("Match battle error:", error);
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

    // NOTE: Mission update moved outside transaction to avoid read-after-write violation

    materialRefs.forEach((ref) => t.delete(ref));

    return { baseRobotId: baseRef.id, newLevel, newXp };
  });

  // Post-transaction mission update (non-transactional)
  try {
    const postTxnTodayKey = getJstDateKey();
    const missionsRef = admin.firestore().collection('users').doc(userId).collection('missions').doc(postTxnTodayKey);
    const missionSnap = await missionsRef.get();
    let missions = buildDailyMissions();
    if (missionSnap.exists) {
      const data = missionSnap.data();
      missions = (data && Array.isArray(data.missions)) ? data.missions : missions;
    }
    const updatedMissions = missions.map((m: any) => {
      if (m.id === 'synthesize' && !m.claimed) {
        const currentProgress = typeof m.progress === 'number' ? m.progress : 0;
        return { ...m, progress: Math.min(m.target || 1, currentProgress + 1) };
      }
      return m;
    });
    await missionsRef.set({
      missions: updatedMissions,
      dateKey: postTxnTodayKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (missionError) {
    console.error('Mission update failed (non-critical):', missionError);
    // Non-critical failure - don't throw
  }

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

    const success = (randomInt(0, 1_000_000) / 1_000_000) < INHERIT_SUCCESS_RATE;
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
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    if (credits < cost) {
      throw new functions.https.HttpsError('failed-precondition', 'insufficient-funds');
    }

    const inventorySnap = await t.get(inventoryRef);
    const currentQty = inventorySnap.exists && typeof inventorySnap.data()?.qty === "number"
      ? inventorySnap.data()?.qty
      : 0;
    const newQty = currentQty + qty;
    const newCredits = credits - cost;

    t.set(userRef, { credits: newCredits, updatedAt: serverTimestamp }, { merge: true });
    t.set(inventoryRef, { itemId, qty: newQty, updatedAt: serverTimestamp }, { merge: true });

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

    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
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

      t.set(returnRef, { itemId: currentItem, qty: newReturnQty, updatedAt: serverTimestamp }, { merge: true });
      t.update(robotRef, {
        [`equipped.${slotKey}`]: null,
        updatedAt: serverTimestamp
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
    t.set(equipRef, { itemId, qty: newEquipQty, updatedAt: serverTimestamp }, { merge: true });
    inventoryUpdates[itemId] = newEquipQty;

    if (currentItem) {
      const returnRef = inventoryCollection.doc(currentItem);
      const returnSnap = await t.get(returnRef);
      const returnQty = returnSnap.exists && typeof returnSnap.data()?.qty === "number"
        ? returnSnap.data()?.qty
        : 0;
      const newReturnQty = returnQty + 1;
      t.set(returnRef, { itemId: currentItem, qty: newReturnQty, updatedAt: serverTimestamp }, { merge: true });
      inventoryUpdates[currentItem] = newReturnQty;
    }

    const nextEquipped = { ...equipped, [slotKey]: itemId };
    t.update(robotRef, {
      [`equipped.${slotKey}`]: itemId,
      updatedAt: serverTimestamp
    });

    return { equipped: nextEquipped, inventory: inventoryUpdates };
  });

  return result;
});

// ログインボーナスAPI
// 日次ログイン請求API (称号/バッジ)
export const claimDailyLogin = functions.https.onCall(async (_data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const userId = context.auth.uid;
  const userRef = admin.firestore().collection('users').doc(userId);
  const todayKey = getJstDateKey();
  const yesterdayKey = getYesterdayJstDateKey();

  const result = await admin.firestore().runTransaction(async (t) => {
    const userSnap = await t.get(userRef);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('failed-precondition', 'User not found');
    }
    const userData = userSnap.data() || {};
    const lastDailyClaimDateKey = typeof userData?.lastDailyClaimDateKey === "string"
      ? userData.lastDailyClaimDateKey
      : userData?.lastLoginDateKey;
    const isPremium = !!userData?.isPremium;
    const bonusAmount = isPremium ? LOGIN_BONUS_CREDITS * 2 : LOGIN_BONUS_CREDITS;

    const resolved = resolveDailyLogin({
      todayKey,
      yesterdayKey,
      bonusAmount,
      state: {
        lastDailyClaimDateKey,
        loginStreak: userData?.loginStreak,
        maxLoginStreak: userData?.maxLoginStreak,
        badgeIds: userData?.badgeIds,
        titleId: userData?.titleId,
        credits: getUserCredits(userData),
      },
    });

    if (!resolved.claimed) {
      return {
        claimed: false,
        dateKey: resolved.dateKey,
        streak: resolved.streak,
        newBadges: [],
        titleId: resolved.titleId,
        creditsGained: 0,
      };
    }

    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
    t.set(userRef, {
      credits: resolved.credits,
      lastDailyClaimDateKey: resolved.dateKey,
      lastLoginDateKey: resolved.dateKey,
      loginStreak: resolved.streak,
      maxLoginStreak: resolved.maxStreak,
      badgeIds: resolved.badgeIds,
      titleId: resolved.titleId,
      updatedAt: serverTimestamp,
    }, { merge: true });

    return {
      claimed: true,
      dateKey: resolved.dateKey,
      streak: resolved.streak,
      newBadges: resolved.newBadges,
      titleId: resolved.titleId,
      creditsGained: resolved.creditsGained,
    };
  });

  return result;
});

// ログインボーナスAPI (legacy)
export const claimLoginBonus = functions.https.onCall(async (_data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const userId = context.auth.uid;
  const userRef = admin.firestore().collection('users').doc(userId);
  const todayKey = getJstDateKey();
  const yesterdayKey = getYesterdayJstDateKey();

  const result = await admin.firestore().runTransaction(async (t) => {
    const userSnap = await t.get(userRef);
    const userData = userSnap.exists ? userSnap.data() : {};
    const lastDailyClaimDateKey = typeof userData?.lastDailyClaimDateKey === "string"
      ? userData.lastDailyClaimDateKey
      : userData?.lastLoginDateKey;
    const isPremium = !!userData?.isPremium;
    const bonusAmount = isPremium ? LOGIN_BONUS_CREDITS * 2 : LOGIN_BONUS_CREDITS;

    const resolved = resolveDailyLogin({
      todayKey,
      yesterdayKey,
      bonusAmount,
      state: {
        lastDailyClaimDateKey,
        loginStreak: userData?.loginStreak,
        maxLoginStreak: userData?.maxLoginStreak,
        badgeIds: userData?.badgeIds,
        titleId: userData?.titleId,
        credits: getUserCredits(userData),
      },
    });

    if (!resolved.claimed) {
      throw new functions.https.HttpsError('failed-precondition', 'Already claimed today');
    }

    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
    t.set(userRef, {
      credits: resolved.credits,
      lastDailyClaimDateKey: resolved.dateKey,
      lastLoginDateKey: resolved.dateKey,
      loginStreak: resolved.streak,
      maxLoginStreak: resolved.maxStreak,
      badgeIds: resolved.badgeIds,
      titleId: resolved.titleId,
      updatedAt: serverTimestamp
    }, { merge: true });

    return { streak: resolved.streak, credits: resolved.credits, bonusAmount };
  });

  return result;
});

// デイリーミッション取得/生成API
export const getDailyMissions = functions.https.onCall(async (_data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const userId = context.auth.uid;
  const userRef = admin.firestore().collection('users').doc(userId);
  const dateKey = getJstDateKey();
  const missionsRef = userRef.collection('missions').doc(dateKey);

  const result = await admin.firestore().runTransaction(async (t) => {
    const missionSnap = await t.get(missionsRef);
    if (missionSnap.exists) {
      const data = missionSnap.data() || {};
      const missions = Array.isArray(data.missions) ? data.missions : buildDailyMissions();
      return { dateKey, missions };
    }

    const missions = buildDailyMissions();
    t.set(missionsRef, {
      dateKey,
      missions,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { dateKey, missions };
  });

  return result;
});

// デイリーミッション報酬受取API
export const claimMissionReward = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const dateKey = data?.dateKey;
  const missionId = data?.missionId;

  if (typeof dateKey !== "string" || typeof missionId !== "string") {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
  }

  const todayKey = getJstDateKey();
  if (dateKey !== todayKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Invalid mission date');
  }

  const userId = context.auth.uid;
  const userRef = admin.firestore().collection('users').doc(userId);
  const missionsRef = userRef.collection('missions').doc(dateKey);

  const result = await admin.firestore().runTransaction(async (t) => {
    const [userSnap, missionSnap] = await Promise.all([t.get(userRef), t.get(missionsRef)]);
    if (!missionSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Missions not found');
    }

    const missionData = missionSnap.data() || {};
    const missions = Array.isArray(missionData.missions) ? missionData.missions : [];
    const missionIndex = missions.findIndex((mission: any) => mission?.id === missionId);

    if (missionIndex === -1) {
      throw new functions.https.HttpsError('not-found', 'Mission not found');
    }

    const mission = missions[missionIndex];
    const claimed = mission?.claimed === true;
    const progress = typeof mission?.progress === "number" ? mission.progress : 0;
    const target = typeof mission?.target === "number" ? mission.target : 0;

    if (claimed) {
      throw new functions.https.HttpsError('failed-precondition', 'Mission already claimed');
    }

    if (progress < target) {
      throw new functions.https.HttpsError('failed-precondition', 'Mission not completed');
    }

    const rewardCredits = typeof mission?.rewardCredits === "number" ? mission.rewardCredits : 0;
    const credits = getUserCredits(userSnap.exists ? userSnap.data() : {});
    const newCredits = credits + rewardCredits;

    const nextMissions = missions.map((entry: any, index: number) => {
      if (index !== missionIndex) return entry;
      return { ...entry, claimed: true };
    });

    t.set(missionsRef, { missions: nextMissions }, { merge: true });
    t.set(userRef, { credits: newCredits }, { merge: true });

    return { credits: newCredits, missionId };
  });

  return result;
});

// Stripe functions are exported later

// フォローAPI
export const followUser = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const targetUid = data?.targetUid;
  if (typeof targetUid !== "string" || targetUid.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid target user');
  }

  const userId = context.auth.uid;
  if (userId === targetUid) {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot follow yourself');
  }

  const publicUsersRef = admin.firestore().collection('publicUsers');
  const userRef = publicUsersRef.doc(userId);
  const targetRef = publicUsersRef.doc(targetUid);
  const followingRef = userRef.collection('following').doc(targetUid);
  const followersRef = targetRef.collection('followers').doc(userId);

  await admin.firestore().runTransaction(async (t) => {
    t.set(userRef, { uid: userId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    t.set(targetRef, { uid: targetUid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    t.set(followingRef, { uid: targetUid, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    t.set(followersRef, { uid: userId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });

  return { ok: true };
});

// ランキング更新スケジュール関数
export const updateRanking = onSchedule({ schedule: '0 0 * * *', timeZone: 'Asia/Tokyo' }, async (event) => {
  const db = admin.firestore();

  // 全ユーザーをランキングポイント順に取得
  const usersSnap = await db
    .collection('users')
    .orderBy('rankingPoints', 'desc')
    .limit(100)
    .get();

  const topPlayers = usersSnap.docs.map((doc, index) => ({
    userId: doc.id,
    username: doc.data().username,
    rankingPoints: doc.data().rankingPoints,
    totalWins: doc.data().totalWins,
    rank: index + 1
  }));

  // ランキングドキュメント更新
  await db.collection('ranking').doc('global').set({
    period: 'global',
    topPlayers,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log('Ranking updated:', topPlayers.length, 'players');
});

// 実績チェックトリガー
export const checkAchievements = onDocumentUpdated('users/{userId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  const userId = event.params.userId;

  if (!beforeData || !afterData) return;

  const db = admin.firestore();

  // 変更を検出
  const changes = {
    totalWins: (afterData.totalWins || 0) - (beforeData.totalWins || 0),
    currentWinStreak: afterData.currentWinStreak || 0,
    rankingPoints: afterData.rankingPoints || 0
  };

  const unlockAchievement = async (achievementId: number) => {
    const achievementRef = db
      .collection('users').doc(userId)
      .collection('achievements').doc(String(achievementId));

    const achievementSnap = await achievementRef.get();

    if (!achievementSnap.exists || !achievementSnap.data()?.isCompleted) {
      await achievementRef.set({
        achievementId,
        progress: 1,
        target: 1,
        isCompleted: true,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('Achievement unlocked:', userId, achievementId);
    }
  };

  // 実績チェック
  if (changes.totalWins > 0) {
    // 初陣（1勝）
    if (afterData.totalWins === 1) {
      await unlockAchievement(1);
    }

    // 百戦錬磨（100勝）
    if (afterData.totalWins === 100) {
      await unlockAchievement(2);
    }
  }

  // 三連勝
  if (changes.currentWinStreak >= 3 && (beforeData.currentWinStreak || 0) < 3) {
    await unlockAchievement(4);
  }

  // ランキングポイント1500
  if (changes.rankingPoints >= 1500 && (beforeData.rankingPoints || 0) < 1500) {
    await unlockAchievement(45);
  }
});

// =====================================
// アイテム使用関連
// =====================================

// 強化アイテムの効果定義
const UPGRADE_ITEMS = {
  power_core: { stat: 'baseAttack', value: 5 },
  shield_plate: { stat: 'baseDefense', value: 5 },
  speed_chip: { stat: 'baseSpeed', value: 5 },
  hp_module: { stat: 'baseHp', value: 50 },
} as const;

type UpgradeItemId = keyof typeof UPGRADE_ITEMS;

const isUpgradeItemId = (id: string): id is UpgradeItemId => {
  return Object.prototype.hasOwnProperty.call(UPGRADE_ITEMS, id);
};

// コスメティックアイテムの定義
const COSMETIC_ITEMS = ['gold_coating', 'neon_glow', 'flame_aura', 'ice_armor'] as const;

type CosmeticItemId = typeof COSMETIC_ITEMS[number];

const isCosmeticItemId = (id: string): id is CosmeticItemId => {
  return COSMETIC_ITEMS.includes(id as CosmeticItemId);
};

// クラフトAPI (ScanToken + Credits)
export const craftItem = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const recipeId = typeof data?.recipeId === "string"
    ? data.recipeId
    : (typeof data?.itemId === "string" ? data.itemId : null);
  const qty = typeof data?.qty === "number" ? data.qty : 1;

  if (typeof recipeId !== "string") {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
  }

  if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid quantity');
  }

  if (!isCraftItemId(recipeId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown craft item');
  }

  const userId = context.auth.uid;
  const userRef = admin.firestore().collection('users').doc(userId);
  const inventoryRef = userRef.collection('inventory').doc(recipeId);
  const { totalTokenCost, totalCreditCost } = getCraftCosts(recipeId, qty);

  const result = await admin.firestore().runTransaction(async (t) => {
    const userSnap = await t.get(userRef);
    const userData = userSnap.exists ? userSnap.data() : {};
    const scanTokens = typeof userData?.scanTokens === "number" ? userData.scanTokens : 0;
    const credits = getUserCredits(userData);

    const inventorySnap = await t.get(inventoryRef);
    const currentQty = inventorySnap.exists && typeof inventorySnap.data()?.qty === "number"
      ? inventorySnap.data()?.qty
      : 0;
    const craftResult = applyCraftBalances({
      currentTokens: scanTokens,
      currentCredits: credits,
      currentQty,
      itemId: recipeId,
      qty,
    });
    if (!craftResult.ok) {
      throw new functions.https.HttpsError('failed-precondition', craftResult.reason);
    }

    const newQty = craftResult.nextQty;
    const newCredits = craftResult.nextCredits;
    const newScanTokens = craftResult.nextTokens;
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    t.set(userRef, {
      credits: newCredits,
      scanTokens: newScanTokens,
      updatedAt: serverTimestamp
    }, { merge: true });
    t.set(inventoryRef, { itemId: recipeId, qty: newQty, updatedAt: serverTimestamp }, { merge: true });

    const ledgerRef = userRef.collection('ledger').doc();
    t.set(ledgerRef, {
      ...buildLedgerEntry({
        type: "CRAFT",
        deltaCredits: -totalCreditCost,
        deltaScanTokens: -totalTokenCost,
        refId: `craft:${recipeId}:${qty}`
      }),
      createdAt: serverTimestamp
    });

    return {
      ok: true,
      recipeId,
      credits: newCredits,
      scanTokens: newScanTokens,
      newBalances: { credits: newCredits, scanTokens: newScanTokens },
      inventoryDelta: { itemId: recipeId, qty, totalQty: newQty },
      craftCost: { tokens: totalTokenCost, credits: totalCreditCost },
    };
  });

  return result;
});

// ロボット強化アイテム使用API
export const useUpgradeItem = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
  }

  const { robotId, itemId } = data;

  if (typeof robotId !== 'string' || typeof itemId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '無効なパラメータです');
  }

  if (!isUpgradeItemId(itemId)) {
    throw new functions.https.HttpsError('invalid-argument', '無効なアイテムです');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  const robotRef = userRef.collection('robots').doc(robotId);
  const inventoryRef = userRef.collection('inventory').doc(itemId);

  const result = await db.runTransaction(async (t) => {
    const [robotSnap, inventorySnap] = await Promise.all([
      t.get(robotRef),
      t.get(inventoryRef)
    ]);

    if (!robotSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'ロボットが見つかりません');
    }

    const inventoryData = inventorySnap.data();
    const qty = inventoryData?.qty ?? 0;

    if (qty < 1) {
      throw new functions.https.HttpsError('failed-precondition', 'アイテムが不足しています');
    }

    const robotData = robotSnap.data() as any;
    const item = UPGRADE_ITEMS[itemId];
    const currentValue = robotData[item.stat] ?? 0;
    const newValue = currentValue + item.value;

    // ロボットのステータス更新
    t.update(robotRef, {
      [item.stat]: newValue,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // インベントリ減少
    t.update(inventoryRef, {
      qty: qty - 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      robotId,
      stat: item.stat,
      oldValue: currentValue,
      newValue,
      itemUsed: itemId,
      remainingQty: qty - 1
    };
  });

  return result;
});

// コスメティックアイテム適用API
export const applyCosmeticItem = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
  }

  const { robotId, itemId } = data;

  if (typeof robotId !== 'string' || typeof itemId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '無効なパラメータです');
  }

  if (!isCosmeticItemId(itemId)) {
    throw new functions.https.HttpsError('invalid-argument', '無効なコスメティックアイテムです');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  const robotRef = userRef.collection('robots').doc(robotId);
  const inventoryRef = userRef.collection('inventory').doc(itemId);

  const result = await db.runTransaction(async (t) => {
    const [robotSnap, inventorySnap] = await Promise.all([
      t.get(robotRef),
      t.get(inventoryRef)
    ]);

    if (!robotSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'ロボットが見つかりません');
    }

    const inventoryData = inventorySnap.data();
    const qty = inventoryData?.qty ?? 0;

    if (qty < 1) {
      throw new functions.https.HttpsError('failed-precondition', 'アイテムが不足しています');
    }

    const robotData = robotSnap.data() as any;
    const currentCosmetics: string[] = robotData.cosmetics || [];

    // 既に適用済みかチェック
    if (currentCosmetics.includes(itemId)) {
      throw new functions.https.HttpsError('already-exists', 'このコスメティックは既に適用されています');
    }

    // ロボットにコスメティック追加
    t.update(robotRef, {
      cosmetics: [...currentCosmetics, itemId],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // インベントリ減少
    t.update(inventoryRef, {
      qty: qty - 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      robotId,
      cosmeticApplied: itemId,
      allCosmetics: [...currentCosmetics, itemId],
      remainingQty: qty - 1
    };
  });

  return result;
});

// =====================================
// Stripe決済関連
// =====================================
import Stripe from 'stripe';
import { defineSecret } from "firebase-functions/params";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Stripe Price IDs（Stripeダッシュボードで作成済み）
const STRIPE_PRICES = {
  credits_100: { priceId: 'price_1SjPcuRy3cnjpOGFNMSku9Op', credits: 100 },
  credits_500: { priceId: 'price_1SjPsxRy3cnjpOGFK5rCDh9q', credits: 500 },
  credits_1200: { priceId: 'price_1SjPqhRy3cnjpOGF1EIsZba4', credits: 1200 },
  premium_monthly: { priceId: 'price_1SjPgiRy3cnjpOGFbq8hgztq' },
} as const;

type CreditPackId = 'credits_100' | 'credits_500' | 'credits_1200';

const isCreditPackId = (id: string): id is CreditPackId => {
  return id === 'credits_100' || id === 'credits_500' || id === 'credits_1200';
};

// Stripe Checkout セッション作成（クレジットパック購入）
export const createCheckoutSession = functions
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data: any, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }

    const { packId, successUrl, cancelUrl } = data;

    if (!packId || !successUrl || !cancelUrl) {
      throw new functions.https.HttpsError('invalid-argument', '必要なパラメータが不足しています');
    }

    if (!isCreditPackId(packId)) {
      throw new functions.https.HttpsError('invalid-argument', '無効なパックIDです');
    }

    const pack = STRIPE_PRICES[packId];
    const userId = context.auth.uid;

    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: '2025-12-15.clover' });

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: pack.priceId,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          packId,
          credits: String(pack.credits),
          type: 'credit_pack',
        },
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      console.error('Stripe checkout error:', error);
      throw new functions.https.HttpsError('internal', '決済セッションの作成に失敗しました');
    }
  });

// Stripe Checkout セッション作成（プレミアム会員サブスク）
export const createSubscriptionSession = functions
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data: any, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }

    const { successUrl, cancelUrl } = data;

    if (!successUrl || !cancelUrl) {
      throw new functions.https.HttpsError('invalid-argument', '必要なパラメータが不足しています');
    }

    const userId = context.auth.uid;
    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: '2025-12-15.clover' });

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: STRIPE_PRICES.premium_monthly.priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          type: 'premium_subscription',
        },
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      console.error('Stripe subscription error:', error);
      throw new functions.https.HttpsError('internal', 'サブスクリプションセッションの作成に失敗しました');
    }
  });

// Stripe カスタマーポータルセッション作成
export const createPortalSession = functions
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data: any, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }

    const { returnUrl } = data;
    if (!returnUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Return URL is required');
    }

    const userId = context.auth.uid;
    const db = admin.firestore();
    const userSnap = await db.collection('users').doc(userId).get();
    const userData = userSnap.data();
    const stripeCustomerId = userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new functions.https.HttpsError('failed-precondition', 'サブスクリプション情報が見つかりません');
    }

    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: '2025-12-15.clover' });

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error) {
      console.error('Portal session error:', error);
      throw new functions.https.HttpsError('internal', 'ポータルセッションの作成に失敗しました');
    }
  });

// Stripe Webhook（決済完了時の処理）
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

export const stripeWebhook = functions
  .runWith({ secrets: [stripeSecretKey, stripeWebhookSecret] })
  .https.onRequest(async (req, res) => {
    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: '2025-12-15.clover' });

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      res.status(400).send('Missing stripe-signature');
      return;
    }

    let event: Stripe.Event;

    try {
      // Webhook署名検証
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error('Webhook verification failed:', err);
      res.status(400).send('Webhook signature verification failed');
      return;
    }

    const db = admin.firestore();

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const metadata = session.metadata || {};
          const userId = metadata.userId;
          const type = metadata.type;

          if (!userId) {
            console.error('No userId in metadata');
            break;
          }

          const userRef = db.collection('users').doc(userId);
          const eventRef = db.collection('webhook_events').doc(event.id);

          await db.runTransaction(async (t) => {
            const eventDoc = await t.get(eventRef);
            if (eventDoc.exists) {
              console.log(`Event ${event.id} already processed`);
              return;
            }

            if (type === 'credit_pack') {
              const credits = parseInt(metadata.credits || '0', 10);
              if (credits > 0) {
                t.update(userRef, {
                  credits: admin.firestore.FieldValue.increment(credits),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`Added ${credits} credits to user ${userId}`);
              }
            } else if (type === 'premium_subscription') {
              t.update(userRef, {
                isPremium: true,
                stripeCustomerId: session.customer,
                premiumStartedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log(`User ${userId} upgraded to premium`);
            }

            // Mark event as processed
            t.set(eventRef, {
              processedAt: admin.firestore.FieldValue.serverTimestamp(),
              type: event.type
            });

            // Save purchase history (outside transaction or inside? inside is safer)
            const purchaseRef = db.collection('purchases').doc(); // Auto ID
            t.set(purchaseRef, {
              userId,
              type,
              sessionId: session.id,
              amountTotal: session.amount_total,
              currency: session.currency,
              metadata,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          break;
        }

        case 'customer.subscription.deleted': {
          // サブスク解約時
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          // customerId からユーザーを検索（メタデータにuserIdがない場合）
          const purchasesSnap = await db.collection('purchases')
            .where('type', '==', 'premium_subscription')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

          // TODO: より堅牢な実装が必要（stripeCustomerIdをユーザーに保存するなど）
          console.log('Subscription cancelled:', customerId, 'purchases found:', purchasesSnap.size);
          // customerId からユーザーを検索してダウングレード
          const usersSnap = await db.collection('users')
            .where('stripeCustomerId', '==', customerId)
            .limit(1)
            .get();

          if (!usersSnap.empty) {
            const userDoc = usersSnap.docs[0];
            await userDoc.ref.update({
              isPremium: false,
              premiumEndedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Subscription cancelled for user ${userDoc.id} (Customer: ${customerId})`);
          } else {
            console.warn(`User not found for cancelled subscription (Customer: ${customerId})`);
            // エラーを投げずログのみ。リトライしてもユーザーが見つかるわけではないため。
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).send('Webhook processing failed');
    }
  });

// ====================
// オンラインマッチメイキング
// ====================

const MATCHMAKING_RATING_RANGE = 200; // ±200のレーティング差まで許容
const MATCHMAKING_TIMEOUT_MS = 30000; // 30秒でタイムアウト

const sendBattleNotification = async (userId: string, title: string, body: string) => {
  const db = admin.firestore();
  const tokensSnap = await db.collection('users').doc(userId).collection('fcmTokens').get();

  if (tokensSnap.empty) return;

  const tokens = tokensSnap.docs.map(doc => doc.id);
  const message = {
    notification: { title, body },
    tokens: tokens
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('Notifications sent:', response.successCount);

    // Cleanup invalid tokens if any
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      // Optionally delete invalid tokens here
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

export const joinMatchmaking = functions.https.onCall(async (data: { robotId: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { robotId } = data;
  if (!robotId) {
    throw new functions.https.HttpsError('invalid-argument', 'robotId is required');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();

  try {
    // 1. ユーザーのロボットとレーティングを取得
    const userDoc = await db.collection('users').doc(userId).get();
    const robotDoc = await db.collection('users').doc(userId).collection('robots').doc(robotId).get();

    if (!robotDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Robot not found');
    }

    const userData = userDoc.data() || {};
    const playerRating = userData.rating || 1000;
    const robotData = robotDoc.data();

    // 2. 既存のキュー登録をチェック（重複防止）
    const existingQueue = await db.collection('matchmaking_queue')
      .where('userId', '==', userId)
      .where('status', '==', 'waiting')
      .get();

    if (!existingQueue.empty) {
      // 既に待機中
      return { status: 'waiting', queueId: existingQueue.docs[0].id };
    }

    // 3. マッチング相手を探す
    const potentialMatches = await db.collection('matchmaking_queue')
      .where('status', '==', 'waiting')
      .where('rating', '>=', playerRating - MATCHMAKING_RATING_RANGE)
      .where('rating', '<=', playerRating + MATCHMAKING_RATING_RANGE)
      .orderBy('rating')
      .orderBy('createdAt')
      .limit(10)
      .get();

    // 自分以外のプレイヤーを探す
    const opponent = potentialMatches.docs.find(doc => doc.data().userId !== userId);

    if (opponent) {
      // マッチング成功！
      const opponentData = opponent.data();

      // バトルを作成
      const battleRef = db.collection('online_battles').doc();
      const battleId = battleRef.id;

      await db.runTransaction(async (transaction) => {
        // キューから削除
        transaction.update(opponent.ref, { status: 'matched', matchedAt: admin.firestore.FieldValue.serverTimestamp() });

        // バトル作成
        transaction.set(battleRef, {
          player1: {
            odcId: opponentData.userId,
            odcName: opponentData.userName,
            robotId: opponentData.robotId,
            robotName: opponentData.robotName,
            rating: opponentData.rating,
          },
          player2: {
            odcId: userId,
            odcName: userData.displayName || 'Player',
            robotId: robotId,
            robotName: robotData?.name || 'Robot',
            rating: playerRating,
          },
          status: 'ready',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Notify opponent
      await sendBattleNotification(
        opponentData.userId,
        "Battle Start!",
        `A battle against ${userData.displayName || 'Player'} has started!`
      );

      return {
        status: 'matched',
        battleId,
        opponent: {
          name: opponentData.userName,
          robotName: opponentData.robotName,
          rating: opponentData.rating,
        }
      };

      // Notify opponent (fire and forget)
      // Note: We return first for speed, but Cloud Functions might terminate.
      // Better to await or use background trigger, but for now we put it before return or use background promise if keeping alive.
      // Since it's onCall, we must await to ensure execution.
    } else {
      // マッチング相手がいない → キューに追加
      const queueRef = await db.collection('matchmaking_queue').add({
        userId: userId,
        userName: userData.displayName || 'Player',
        robotId: robotId,
        robotName: robotData?.name || 'Robot',
        rating: playerRating,
        status: 'waiting',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { status: 'waiting', queueId: queueRef.id };
    }
  } catch (error) {
    console.error('joinMatchmaking error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Matchmaking failed');
  }
});

export const leaveMatchmaking = functions.https.onCall(async (data: { queueId?: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();

  try {
    // キューIDが指定されていればそれを削除、なければユーザーのすべての待機中エントリを削除
    if (data.queueId) {
      const queueDoc = await db.collection('matchmaking_queue').doc(data.queueId).get();
      if (queueDoc.exists && queueDoc.data()?.userId === userId) {
        await queueDoc.ref.delete();
      }
    } else {
      const userQueues = await db.collection('matchmaking_queue')
        .where('userId', '==', userId)
        .where('status', '==', 'waiting')
        .get();

      const batch = db.batch();
      userQueues.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    return { success: true };
  } catch (error) {
    console.error('leaveMatchmaking error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to leave matchmaking');
  }
});

// オンラインバトルのステータスをチェック（ポーリング用）
export const checkMatchStatus = functions.https.onCall(async (data: { queueId: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { queueId } = data;
  if (!queueId) {
    throw new functions.https.HttpsError('invalid-argument', 'queueId is required');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();

  try {
    const queueDoc = await db.collection('matchmaking_queue').doc(queueId).get();

    if (!queueDoc.exists) {
      return { status: 'expired' };
    }

    const queueData = queueDoc.data()!;

    if (queueData.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your queue entry');
    }

    if (queueData.status === 'matched') {
      // マッチした相手を探す
      const battles = await db.collection('online_battles')
        .where('status', '==', 'ready')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      for (const battleDoc of battles.docs) {
        const battle = battleDoc.data();
        if (battle.player1.userId === userId || battle.player2.userId === userId) {
          return {
            status: 'matched',
            battleId: battleDoc.id,
            opponent: battle.player1.userId === userId ? battle.player2 : battle.player1
          };
        }
      }
    }

    // タイムアウトチェック
    const createdAt = queueData.createdAt?.toMillis() || 0;
    if (Date.now() - createdAt > MATCHMAKING_TIMEOUT_MS) {
      await queueDoc.ref.delete();
      return { status: 'timeout' };
    }

    return { status: 'waiting' };
  } catch (error) {
    console.error('checkMatchStatus error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to check match status');
  }
});

// Gemini API Barcode Scanner
export { scanBarcodeFromImage } from "./geminiScanner";

// ============================================
// Variant System Functions
// ============================================

export const createVariant = functions.https.onCall(async (data: any, context) => {
  const db = admin.firestore();
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  const uid = context.auth.uid;
  const { robotIdA, robotIdB, name } = data;

  if (!robotIdA || !robotIdB) throw new functions.https.HttpsError('invalid-argument', 'Missing parents');

  // Transaction for safety (Credits & Limit)
  return db.runTransaction(async (t) => {
    // 1. Fetch User & Robots
    const userRef = db.collection('users').doc(uid);
    const rARef = db.collection('users').doc(uid).collection('robots').doc(robotIdA);
    const rBRef = db.collection('users').doc(uid).collection('robots').doc(robotIdB);

    const [userDoc, rA, rB] = await Promise.all([
      t.get(userRef),
      t.get(rARef),
      t.get(rBRef)
    ]);

    if (!rA.exists || !rB.exists) throw new functions.https.HttpsError('not-found', 'Parent not found');
    const userData = userDoc.data() || {};
    const limit = userData.workshopLines || 0;

    // 2. Check Capacity (Count variants)
    // Note: Transactional count of collection is strict. 
    // Optimization: Store 'variantCount' on userDoc if scale is high. For now, reading all keys is barely OK if limit is small (e.g. 10).
    // Or just count() query (requires aggregation query which is not transactional in older SDKs? Modern Firebase supports it).
    // Simple approach: trust existing count or just allow slight overage.
    // User requirement: "Strict". I'll use `get()` size if small. Default limit starts at 3. Max likely 20.
    const vSnap = await t.get(db.collection('users').doc(uid).collection('variants'));
    if (vSnap.size >= limit) {
      throw new functions.https.HttpsError('resource-exhausted', `Workshop full`);
    }

    // 3. Check Cost / Daily Free
    const VARIANT_COST = 5;
    const nowJST = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const lastFree = userData.lastFreeVariantDate; // "YYYY-M-D" string expected

    let isFree = false;
    let chargedCredits = 0;

    if (lastFree !== nowJST) {
      isFree = true;
    } else {
      if ((userData.credits || 0) < VARIANT_COST) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits');
      }
      chargedCredits = VARIANT_COST;
    }

    // 4. Generate Recipe
    const recipe = generateVariantRecipe(uid, robotIdA, robotIdB);
    const sortedIds = [robotIdA, robotIdB].sort();
    const pA = sortedIds[0] === robotIdA ? rA : rB;
    const pB = sortedIds[1] === robotIdA ? rA : rB;
    const appearance = resolveVariantAppearance(recipe, pA.data() as any, pB.data() as any);

    const variantRef = db.collection('users').doc(uid).collection('variants').doc();
    const variantData: VariantData = {
      id: variantRef.id,
      name: name?.slice(0, 20) || `Variant ${variantRef.id.slice(0, 4)}`, // Use provided name or default
      parentRobotIds: [sortedIds[0], sortedIds[1]],
      appearanceRecipe: recipe,
      parts: appearance.parts,
      colors: appearance.colors,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 5. Writes
    t.set(variantRef, variantData);

    const userUpdates: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (isFree) {
      userUpdates.lastFreeVariantDate = nowJST;
    } else {
      userUpdates.credits = (userData.credits || 0) - chargedCredits;
    }
    t.update(userRef, userUpdates);

    // Return extended info
    return {
      variantId: variantRef.id,
      variant: variantData,
      chargedCredits,
      usedFreeToday: isFree,
      remainingLines: limit - (vSnap.size + 1)
    };
  });
});

export async function resolveFighterData(
  uid: string,
  ref: FighterRef | string,
  transaction?: admin.firestore.Transaction
): Promise<any> {
  const db = admin.firestore();
  const id = typeof ref === 'string' ? ref : ref.id;
  const kind = typeof ref === 'string' ? 'robot' : ref.kind;

  if (kind === 'robot') {
    const docRef = db.collection('users').doc(uid).collection('robots').doc(id);
    const doc = transaction ? await transaction.get(docRef) : await docRef.get();
    if (!doc.exists) throw new functions.https.HttpsError('not-found', 'Robot not found');
    return { ...doc.data(), id: doc.id };
  } else {
    const docRef = db.collection('users').doc(uid).collection('variants').doc(id);
    const vDoc = transaction ? await transaction.get(docRef) : await docRef.get();
    if (!vDoc.exists) throw new functions.https.HttpsError('not-found', 'Variant not found');
    const vData = vDoc.data() as VariantData;

    const p1Ref = db.collection('users').doc(uid).collection('robots').doc(vData.parentRobotIds[0]);
    const p2Ref = db.collection('users').doc(uid).collection('robots').doc(vData.parentRobotIds[1]);

    const [p1, p2] = await Promise.all([
      transaction ? transaction.get(p1Ref) : p1Ref.get(),
      transaction ? transaction.get(p2Ref) : p2Ref.get()
    ]);

    if (!p1.exists || !p2.exists) throw new functions.https.HttpsError('failed-precondition', 'Parent robot missing');

    const rA = { ...p1.data(), id: p1.id } as any;
    const rB = { ...p2.data(), id: p2.id } as any;

    const stats = resolveVariantStats(rA, rB);
    const appearance = resolveVariantAppearance(vData.appearanceRecipe, rA, rB);

    return {
      id: vData.id,
      userId: uid,
      name: `Variant ${vData.id?.slice(0, 4)}`,
      sourceBarcode: 'FUSION',
      ...stats,
      parts: appearance.parts,
      colors: appearance.colors,
      skills: rA.skills,
      isVariant: true,
      variantId: vData.id,
      totalBattles: 0,
      totalWins: 0,
      isFavorite: false,
      level: rA.level || 1,
      xp: 0
    };
  }
}
