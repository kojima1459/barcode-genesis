"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWeeklyBattle = exports.getWeeklyBoss = exports.executeMilestoneBattle = exports.getMilestoneBoss = exports.executeBossBattle = exports.getDailyBoss = exports.resolveFighterData = exports.deleteVariant = exports.createVariant = exports.scanBarcodeFromImage = exports.checkMatchStatus = exports.leaveMatchmaking = exports.joinMatchmaking = exports.stripeWebhook = exports.createPortalSession = exports.createSubscriptionSession = exports.createCheckoutSession = exports.applyCosmeticItem = exports.useUpgradeItem = exports.craftItem = exports.checkAchievements = exports.updateRanking = exports.followUser = exports.claimMissionReward = exports.getDailyMissions = exports.claimLoginBonus = exports.claimDailyLogin = exports.equipItem = exports.purchaseItem = exports.inheritSkill = exports.synthesizeRobots = exports.matchBattle = exports.evolveRobot = exports.batchDisassemble = exports.awardScanToken = exports.generateRobot = exports.ping = exports.debugPing = exports.testFunctionHealth = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const crypto_1 = require("crypto");
const robotGenerator_1 = require("./robotGenerator");
const battleSystem_1 = require("./battleSystem");
const skills_1 = require("./skills");
const seededRandom_1 = require("./seededRandom");
const levelSystem_1 = require("./levelSystem");
const variantSystem_1 = require("./variantSystem");
const battleRewards_1 = require("./battleRewards");
const scanTokens_1 = require("./scanTokens");
const crafting_1 = require("./crafting");
const battleEntryFee_1 = require("./battleEntryFee");
const ledger_1 = require("./ledger");
const dateKey_1 = require("./dateKey");
const dailyLogin_1 = require("./dailyLogin");
const dailyBoss_1 = require("./dailyBoss");
// Node.js 20 has native fetch - no need for node-fetch
// Use a version constant to help track deployments and identify cache issues
const VERSION = "2.1.1-force-refresh";
// Simple test function to verify Cloud Functions are working
exports.testFunctionHealth = functions
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
exports.debugPing = functions
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
exports.ping = functions
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
};
const isItemId = (itemId) => {
    return Object.prototype.hasOwnProperty.call(ITEM_CATALOG, itemId);
};
const LOGIN_BONUS_CREDITS = 50;
const DAILY_MISSIONS = [
    { id: "scan_barcode", title: "Scan 1 barcode", target: 1, rewardCredits: 30 },
    { id: "win_battle", title: "Win 1 battle", target: 1, rewardCredits: 40 },
    { id: "synthesize", title: "Synthesize 1 robot", target: 1, rewardCredits: 50 }
];
const buildDailyMissions = () => {
    return DAILY_MISSIONS.map((mission) => (Object.assign(Object.assign({}, mission), { progress: 0, claimed: false })));
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-expect-error - Kept for potential future use
const _updateMissionProgressInternal = async (t, userRef, dateKey, missionId, increment = 1) => {
    const missionsRef = userRef.collection("missions").doc(dateKey);
    const missionSnap = await t.get(missionsRef);
    let missions;
    if (!missionSnap.exists) {
        missions = buildDailyMissions();
    }
    else {
        const data = missionSnap.data();
        missions = (data && Array.isArray(data.missions)) ? data.missions : buildDailyMissions();
    }
    const updatedMissions = missions.map((m) => {
        if (m.id === missionId && !m.claimed) {
            const currentProgress = typeof m.progress === "number" ? m.progress : 0;
            return Object.assign(Object.assign({}, m), { progress: Math.min(m.target || 1, currentProgress + increment) });
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
const writeMissionProgress = (t, missionsRef, dateKey, missionId, existingMissions, increment = 1) => {
    const missions = (existingMissions && Array.isArray(existingMissions))
        ? existingMissions
        : buildDailyMissions();
    const updatedMissions = missions.map((m) => {
        if (m.id === missionId && !m.claimed) {
            const currentProgress = typeof m.progress === "number" ? m.progress : 0;
            return Object.assign(Object.assign({}, m), { progress: Math.min(m.target || 1, currentProgress + increment) });
        }
        return m;
    });
    t.set(missionsRef, {
        missions: updatedMissions,
        dateKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
};
const getUserCredits = (user) => {
    var _a;
    const credits = (_a = user === null || user === void 0 ? void 0 : user.credits) !== null && _a !== void 0 ? _a : 0;
    return typeof credits === "number" ? credits : 0;
};
// ロボット生成API
const FREE_DAILY_LIMIT = 5; // Free users: 5 scans/day
const PREMIUM_DAILY_LIMIT = 9999; // Premium users: effectively unlimited
exports.generateRobot = functions.https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { barcode } = data !== null && data !== void 0 ? data : {};
    // バリデーション
    if (!barcode || typeof barcode !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid barcode.');
    }
    try {
        const userId = context.auth.uid;
        const db = admin.firestore();
        const userRef = db.collection('users').doc(userId);
        const robotRef = userRef.collection('robots').doc(barcode);
        const todayKey = (0, dateKey_1.getJstDateKey)();
        const scanDailyRef = userRef.collection('scanDaily').doc(todayKey);
        // ロボットデータ生成
        const robotData = (0, robotGenerator_1.generateRobotFromBarcode)(barcode, userId);
        await db.runTransaction(async (t) => {
            var _a;
            const missionsRef = userRef.collection('missions').doc(todayKey);
            const [userSnap, scanDailySnap, robotSnap, missionsSnap] = await Promise.all([
                t.get(userRef),
                t.get(scanDailyRef),
                t.get(robotRef),
                t.get(missionsRef)
            ]);
            const userData = userSnap.exists ? userSnap.data() : {};
            const existingMissions = missionsSnap.exists ? (_a = missionsSnap.data()) === null || _a === void 0 ? void 0 : _a.missions : undefined;
            const isPremium = !!(userData === null || userData === void 0 ? void 0 : userData.isPremium);
            const lastGenDate = userData === null || userData === void 0 ? void 0 : userData.lastGenerationDateKey;
            const currentDailyCount = (lastGenDate === todayKey) ? ((userData === null || userData === void 0 ? void 0 : userData.dailyGenerationCount) || 0) : 0;
            const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
            if (currentDailyCount >= limit) {
                throw new functions.https.HttpsError('resource-exhausted', isPremium
                    ? `Daily limit reached. Come back tomorrow!`
                    : `Free limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Premium for unlimited scans!`);
            }
            (0, robotGenerator_1.assertRobotNotExists)(robotSnap.exists);
            const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
            const scanDailyState = (0, scanTokens_1.normalizeScanDaily)(scanDailySnap.exists ? scanDailySnap.data() : {});
            const scanAward = (0, scanTokens_1.applyScanDailyAward)(scanDailyState, barcode);
            const scanTokenIncrement = scanAward.awarded ? scanTokens_1.SCAN_TOKEN_PER_SCAN : 0;
            t.set(robotRef, Object.assign(Object.assign({}, robotData), { id: robotRef.id, createdAt: serverTimestamp, updatedAt: serverTimestamp }));
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
                t.set(ledgerRef, Object.assign(Object.assign({}, (0, ledger_1.buildLedgerEntry)({
                    type: "SCAN",
                    deltaScanTokens: scanTokenIncrement,
                    refId: `${todayKey}:${barcode}`
                })), { createdAt: serverTimestamp }));
            }
            // Daily Mission: Scan Barcode
            writeMissionProgress(t, missionsRef, todayKey, "scan_barcode", existingMissions);
        });
        return {
            robotId: robotRef.id,
            robot: Object.assign(Object.assign({}, robotData), { id: robotRef.id }),
            version: VERSION
        };
    }
    catch (error) {
        console.error("Error generating robot:", error);
        if (error instanceof robotGenerator_1.InvalidBarcodeError) {
            throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid barcode.');
        }
        if (error instanceof robotGenerator_1.DuplicateRobotError) {
            throw new functions.https.HttpsError('already-exists', 'You already have a robot from this barcode.');
        }
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An error occurred while generating the robot.');
    }
});
// ScanToken issuance (daily per barcode)
exports.awardScanToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const barcode = data === null || data === void 0 ? void 0 : data.barcode;
    if (typeof barcode !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid barcode');
    }
    try {
        (0, robotGenerator_1.assertValidBarcode)(barcode);
    }
    catch (_error) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid barcode');
    }
    const userId = context.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const dateKey = (0, dateKey_1.getJstDateKey)();
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
            const scanDailyState = (0, scanTokens_1.normalizeScanDaily)(scanDailySnap.exists ? scanDailySnap.data() : {});
            const scanAward = (0, scanTokens_1.applyScanDailyAward)(scanDailyState, barcode);
            if (!scanAward.awarded) {
                throw new functions.https.HttpsError('already-exists', 'Scan token already issued');
            }
            const currentTokens = (0, scanTokens_1.normalizeScanTokens)(userData.scanTokens);
            const nextTokens = currentTokens + scanTokens_1.SCAN_TOKEN_PER_SCAN;
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
            t.set(ledgerRef, Object.assign(Object.assign({}, (0, ledger_1.buildLedgerEntry)({
                type: "SCAN",
                deltaScanTokens: scanTokens_1.SCAN_TOKEN_PER_SCAN,
                refId: `${dateKey}:${barcode}`
            })), { createdAt: serverTimestamp }));
            return {
                awarded: true,
                dateKey,
                barcode,
                scanTokensBalance: nextTokens
            };
        });
        return result;
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error("awardScanToken error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to award scan token');
    }
});
// レア度に応じたクレジット変換レート
const RARITY_CREDIT_VALUE = {
    'Common': 10,
    'Rare': 30,
    'Epic': 100,
    'Legendary': 500,
};
// 一括分解API
exports.batchDisassemble = functions.https.onCall(async (data, context) => {
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
            const robotRefs = robotIds.map(id => db.collection('users').doc(userId).collection('robots').doc(id));
            // Fetch all robots to validate and calculate credits
            const robotSnaps = await Promise.all(robotRefs.map(ref => transaction.get(ref)));
            for (const snap of robotSnaps) {
                if (snap.exists) {
                    const robotData = snap.data();
                    const rarityName = (robotData === null || robotData === void 0 ? void 0 : robotData.rarityName) || 'Common';
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
    }
    catch (error) {
        console.error('batchDisassemble error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to disassemble robots');
    }
});
// ============================================
// 進化API (Evolution)
// ============================================
const EVOLUTION_STAT_MULTIPLIER = 1.1; // 10% boost per evolution level
// Helper to get family from barcode (client-side backward compat)
const getFamilyFromBarcode = (barcode) => {
    const d0 = parseInt(barcode[0], 10) || 0;
    const d1 = parseInt(barcode[1], 10) || 0;
    return ((d0 + d1) % 5) + 1;
};
exports.evolveRobot = functions.https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'ログインしてください');
    }
    const { targetBarcode, materialBarcodes } = data !== null && data !== void 0 ? data : {};
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
            var _a, _b, _c;
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
            const targetData = targetSnap.data();
            const mat1Data = mat1Snap.data();
            const mat2Data = mat2Snap.data();
            // 7. Check ownership (all should belong to user)
            if (targetData.userId !== userId || mat1Data.userId !== userId || mat2Data.userId !== userId) {
                throw new functions.https.HttpsError('permission-denied', '権限がありません');
            }
            // 8. Check family match (use stored family or compute from barcode)
            const targetFamily = (_a = targetData.family) !== null && _a !== void 0 ? _a : getFamilyFromBarcode(targetBarcode);
            const mat1Family = (_b = mat1Data.family) !== null && _b !== void 0 ? _b : getFamilyFromBarcode(materialBarcodes[0]);
            const mat2Family = (_c = mat2Data.family) !== null && _c !== void 0 ? _c : getFamilyFromBarcode(materialBarcodes[1]);
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
    }
    catch (error) {
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
const getRobotXp = (robot) => {
    var _a, _b, _c;
    const xp = (_c = (_b = (_a = robot === null || robot === void 0 ? void 0 : robot.xp) !== null && _a !== void 0 ? _a : robot === null || robot === void 0 ? void 0 : robot.exp) !== null && _b !== void 0 ? _b : robot === null || robot === void 0 ? void 0 : robot.experience) !== null && _c !== void 0 ? _c : 0;
    return typeof xp === "number" ? xp : 0;
};
// ELOレーティング期待勝率計算
const expectedWinRate = (playerRating, opponentRating) => {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
};
// レーティング変動計算
const calculateRatingChange = (playerRating, opponentRating, result) => {
    const expected = expectedWinRate(playerRating, opponentRating);
    let actual;
    if (result === 'win')
        actual = 1.0;
    else if (result === 'loss')
        actual = 0.0;
    else
        actual = 0.5;
    return Math.round(K_FACTOR * (actual - expected));
};
// 対戦相手検索
const findOpponent = async (db, playerId, playerRating) => {
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
        .map(doc => (Object.assign({ uid: doc.id }, doc.data())));
    if (candidates.length === 0) {
        // 該当者なし → CPU生成
        const cpuRobot = (0, robotGenerator_1.generateRobotFromBarcode)(String(Math.floor(Math.random() * 1e13)).padStart(13, '0'), 'cpu');
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
    const rng = new seededRandom_1.SeededRandom(Date.now().toString());
    const selectedUser = candidates[rng.nextInt(0, candidates.length - 1)];
    // 選択されたユーザーの最強ロボット取得
    const robotsSnap = await db
        .collection('users').doc(selectedUser.uid)
        .collection('robots')
        .orderBy('totalWins', 'desc')
        .limit(1)
        .get();
    let robot;
    if (robotsSnap.empty) {
        // ロボットを持っていない場合はCPUロボットを使用
        robot = (0, robotGenerator_1.generateRobotFromBarcode)(String(Math.floor(Math.random() * 1e13)).padStart(13, '0'), selectedUser.uid);
    }
    else {
        robot = robotsSnap.docs[0].data();
    }
    return {
        isCPU: false,
        user: selectedUser,
        robot
    };
};
const BATTLE_ITEM_IDS = ['repair_kit', 'attack_boost', 'defense_boost', 'critical_lens'];
const PRE_BATTLE_ITEM_TYPES = ['BOOST', 'SHIELD', 'JAMMER', 'DISRUPT', 'CANCEL_CRIT'];
const normalizePreBattleItem = (item) => {
    if (!item)
        return null;
    if (item === 'CANCEL_CRIT' || item === 'DISRUPT')
        return 'JAMMER';
    return PRE_BATTLE_ITEM_TYPES.includes(item) ? item : null;
};
/**
 * Recursively remove undefined values from an object to prevent Firestore errors.
 * Firestore does not allow undefined values.
 */
const sanitizeForFirestore = (obj) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) {
            continue;
        }
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            sanitized[key] = sanitizeForFirestore(value);
        }
        else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item).filter(item => item !== undefined);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};
const stripItemFields = (log) => {
    const { itemApplied, itemSide, itemType, itemEffect, itemEvent, itemMessage } = log, rest = __rest(log, ["itemApplied", "itemSide", "itemType", "itemEffect", "itemEvent", "itemMessage"]);
    // Remove undefined values to prevent Firestore errors
    const sanitized = {};
    for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) {
            sanitized[key] = value;
        }
    }
    return sanitized;
};
exports.matchBattle = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16;
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
    const normalizedBattleItem = normalizePreBattleItem(battleItems === null || battleItems === void 0 ? void 0 : battleItems.p1);
    if ((battleItems === null || battleItems === void 0 ? void 0 : battleItems.p1) && !normalizedBattleItem) {
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
            : (0, battleRewards_1.levelFromXp)(typeof player.xp === "number" ? player.xp : 0);
        if (normalizedBattleItem && playerLevel < 5) {
            throw new functions.https.HttpsError('failed-precondition', 'item-slots-locked');
        }
        // アイテム所持事前チェック（UXのため。厳密なチェックはトランザクション内で）
        if (useItemId) {
            const itemSnap = await db.collection('users').doc(userId).collection('inventory').doc(useItemId).get();
            const qty = (_b = (_a = itemSnap.data()) === null || _a === void 0 ? void 0 : _a.qty) !== null && _b !== void 0 ? _b : 0;
            if (qty < 1) {
                throw new functions.https.HttpsError('failed-precondition', 'Item not in inventory');
            }
        }
        // Pre-battle item inventory check (UX only; strict check in transaction)
        if (normalizedBattleItem) {
            const inventoryCollection = db.collection('users').doc(userId).collection('inventory');
            if (normalizedBattleItem === 'JAMMER') {
                const jammerSnap = await inventoryCollection.doc('JAMMER').get();
                const jammerQty = (_d = (_c = jammerSnap.data()) === null || _c === void 0 ? void 0 : _c.qty) !== null && _d !== void 0 ? _d : 0;
                if (jammerQty < 1) {
                    const disruptSnap = await inventoryCollection.doc('DISRUPT').get();
                    const disruptQty = (_f = (_e = disruptSnap.data()) === null || _e === void 0 ? void 0 : _e.qty) !== null && _f !== void 0 ? _f : 0;
                    if (disruptQty < 1) {
                        const legacySnap = await inventoryCollection.doc('CANCEL_CRIT').get();
                        const legacyQty = (_h = (_g = legacySnap.data()) === null || _g === void 0 ? void 0 : _g.qty) !== null && _h !== void 0 ? _h : 0;
                        if (legacyQty < 1) {
                            throw new functions.https.HttpsError('failed-precondition', 'Item not in inventory');
                        }
                    }
                }
            }
            else {
                const itemSnap = await inventoryCollection.doc(normalizedBattleItem).get();
                const qty = (_k = (_j = itemSnap.data()) === null || _j === void 0 ? void 0 : _j.qty) !== null && _k !== void 0 ? _k : 0;
                if (qty < 1) {
                    throw new functions.https.HttpsError('failed-precondition', 'Item not in inventory');
                }
            }
        }
        // 3. 対戦相手選択
        const opponent = await findOpponent(db, userId, playerRating);
        const opponentRobot = Object.assign(Object.assign({}, opponent.robot), { id: opponent.robot.id || 'opponent_robot' });
        // 4. バトル実行
        const battleId = db.collection('battles').doc().id;
        const playerItems = useItemId ? [useItemId] : [];
        // Pass cheer input: p1 = player, p2 = opponent
        const cheerInput = cheer ? { p1: !!cheer.p1, p2: !!cheer.p2 } : undefined;
        // Pass battle items: p1 = player, p2 = opponent (opponent doesn't use items in PvE)
        const battleItemInput = normalizedBattleItem ? { p1: normalizedBattleItem, p2: null } : undefined;
        // Pass special move input: p1 = player, p2 = opponent (opponent doesn't use specials in PvE)
        const specialMoveInput = specialInput ? { p1Used: !!specialInput.p1Used, p2Used: false } : undefined;
        const battleResult = (0, battleSystem_1.simulateBattle)(playerRobot, opponentRobot, battleId, playerItems, cheerInput, battleItemInput, specialMoveInput);
        const publicLogs = battleResult.logs.map(stripItemFields);
        // 勝敗判定
        const winnerIsPlayer = battleResult.winnerId === playerRobot.id;
        const winnerIsOpponent = battleResult.winnerId === opponentRobot.id;
        const resultType = winnerIsPlayer ? 'win' : winnerIsOpponent ? 'loss' : 'draw';
        // 5. ランキングポイント計算
        const opponentUser = opponent.user;
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
            const userRef = db.collection('users').doc(userId);
            const robotRef = db.collection('robots').doc(playerRobot.id);
            const battleRef = db.collection('battles').doc(battleId);
            const battleResultRef = userRef.collection('battleResults').doc(battleId);
            const [userSnap, battleSnap, battleResultSnap, robotSnap] = await Promise.all([
                transaction.get(userRef),
                transaction.get(battleRef),
                transaction.get(battleResultRef),
                transaction.get(robotRef)
            ]);
            if (!userSnap.exists)
                throw new functions.https.HttpsError('not-found', 'User not found in transaction');
            const userData = userSnap.data() || {};
            const userLevel = typeof userData.level === "number"
                ? userData.level
                : (0, battleRewards_1.levelFromXp)(typeof userData.xp === "number" ? userData.xp : 0);
            if (normalizedBattleItem && userLevel < 5) {
                throw new functions.https.HttpsError('failed-precondition', 'item-slots-locked');
            }
            if (battleResultSnap.exists || (battleSnap.exists && ((_a = battleSnap.data()) === null || _a === void 0 ? void 0 : _a.rewardGranted))) {
                const fallbackXp = typeof userData.xp === "number" ? userData.xp : 0;
                const fallbackLevel = typeof userData.level === "number" ? userData.level : 1;
                const battleData = battleSnap.exists ? battleSnap.data() : {};
                const existingReward = (_b = battleData === null || battleData === void 0 ? void 0 : battleData.reward) !== null && _b !== void 0 ? _b : {
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
                    capRemaining: battleRewards_1.DAILY_CREDITS_CAP,
                    reason: null,
                };
                const resolvedLevelAfter = typeof existingReward.levelAfter === "number" ? existingReward.levelAfter : fallbackLevel;
                const resolvedLevelBefore = typeof existingReward.levelBefore === "number" ? existingReward.levelBefore : fallbackLevel;
                return {
                    reward: existingReward,
                    earnedCredits: (_c = existingReward.creditsReward) !== null && _c !== void 0 ? _c : 0,
                    earnedXp: (_d = existingReward.xpReward) !== null && _d !== void 0 ? _d : 0,
                    scanTokensGained: (_e = existingReward.scanTokensGained) !== null && _e !== void 0 ? _e : 0,
                    leveledUp: resolvedLevelAfter > resolvedLevelBefore,
                    newWorkshopLines: (0, levelSystem_1.getWorkshopLines)(resolvedLevelAfter),
                };
            }
            const entryFeeState = (0, battleEntryFee_1.resolveEntryFee)({
                credits: getUserCredits(userData),
                entryFeeCharged: battleSnap.exists && ((_f = battleSnap.data()) === null || _f === void 0 ? void 0 : _f.entryFeeCharged) === true,
            });
            if (entryFeeState.insufficient) {
                throw new functions.https.HttpsError('failed-precondition', 'insufficient-credits');
            }
            const entryFeeCharged = entryFeeState.charged;
            const entryFeeAmount = entryFeeCharged ? entryFeeState.fee : 0;
            const todayKey = (0, dateKey_1.getJstDateKey)();
            const isPremiumUser = (userData === null || userData === void 0 ? void 0 : userData.isPremium) === true;
            const rewardResult = (0, battleRewards_1.applyBattleRewards)({
                battleData: { status: "completed", winner: resultType },
                userData,
                userId,
                winnerUid,
                todayKey,
                dailyCreditsCap: battleRewards_1.DAILY_CREDITS_CAP,
                isPremium: isPremiumUser, // Premium XP Bonus (150%)
            });
            const earnedCredits = rewardResult.reward.creditsReward;
            const earnedXp = rewardResult.reward.xpReward;
            const scanTokensGained = (_g = rewardResult.reward.scanTokensGained) !== null && _g !== void 0 ? _g : 0;
            const leveledUp = rewardResult.reward.levelAfter > rewardResult.reward.levelBefore;
            const newWorkshopLines = (0, levelSystem_1.getWorkshopLines)(rewardResult.levelAfter);
            // Robot Leveling Logic
            const robotData = robotSnap.exists ? robotSnap.data() : {};
            const robotCurrentLevel = (robotData === null || robotData === void 0 ? void 0 : robotData.level) || 1;
            const robotCurrentXp = (robotData === null || robotData === void 0 ? void 0 : robotData.xp) || 0;
            const robotXpToAdd = winnerIsPlayer ? battleRewards_1.XP_REWARD : 0; // Use same base allocation as user
            const robotLevelResult = (0, levelSystem_1.applyRobotXp)(robotCurrentLevel, robotCurrentXp, robotXpToAdd);
            if (robotSnap.exists && robotXpToAdd > 0) {
                transaction.update(robotRef, {
                    level: robotLevelResult.newLevel,
                    xp: robotLevelResult.newXp,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            // Pre-battle item consumption (inventory only)
            if (normalizedBattleItem) {
                const inventoryCollection = userRef.collection('inventory');
                let consumeRef = inventoryCollection.doc(normalizedBattleItem);
                const itemDoc = await transaction.get(consumeRef);
                let availableQty = (_j = (_h = itemDoc.data()) === null || _h === void 0 ? void 0 : _h.qty) !== null && _j !== void 0 ? _j : 0;
                if (availableQty < 1 && normalizedBattleItem === 'JAMMER') {
                    const fallbackIds = ['DISRUPT', 'CANCEL_CRIT'];
                    for (const fallbackId of fallbackIds) {
                        const fallbackRef = inventoryCollection.doc(fallbackId);
                        const fallbackDoc = await transaction.get(fallbackRef);
                        const fallbackQty = (_l = (_k = fallbackDoc.data()) === null || _k === void 0 ? void 0 : _k.qty) !== null && _l !== void 0 ? _l : 0;
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
                if (!itemDoc.exists || ((_o = (_m = itemDoc.data()) === null || _m === void 0 ? void 0 : _m.qty) !== null && _o !== void 0 ? _o : 0) < 1) {
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
                    scanTokensGained: (_p = rewardResult.reward.scanTokensGained) !== null && _p !== void 0 ? _p : 0,
                    xpBefore: rewardResult.reward.xpBefore,
                    xpAfter: rewardResult.reward.xpAfter,
                    levelBefore: rewardResult.reward.levelBefore,
                    levelAfter: rewardResult.reward.levelAfter,
                    // Robot Rewards
                    robotLevel: robotLevelResult.newLevel,
                    robotXpEarned: robotXpToAdd,
                    robotLevelUp: robotLevelResult.leveledUp
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
                battleItems: battleItemInput !== null && battleItemInput !== void 0 ? battleItemInput : null,
                entryFeeCharged,
                reward: rewardResult.reward,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // プレイヤー統計更新
            const playerUpdates = {
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
                playerUpdates.dailyBattleCreditsEarned = (_q = rewardResult.dailyBattleCreditsEarned) !== null && _q !== void 0 ? _q : 0;
                playerUpdates.dailyBattleXpEarned = (_r = rewardResult.dailyBattleXpEarned) !== null && _r !== void 0 ? _r : 0;
            }
            if (winnerIsPlayer) {
                playerUpdates.totalWins = admin.firestore.FieldValue.increment(1);
                playerUpdates.currentWinStreak = admin.firestore.FieldValue.increment(1);
                // NOTE: Mission update moved outside transaction to avoid read-after-write violation
                // See post-transaction mission update below
            }
            else if (winnerIsOpponent) {
                playerUpdates.totalLosses = admin.firestore.FieldValue.increment(1);
                playerUpdates.currentWinStreak = 0;
            }
            else {
                playerUpdates.totalDraws = admin.firestore.FieldValue.increment(1);
            }
            transaction.update(userRef, playerUpdates);
            // ロボット統計更新
            const currentExp = getRobotXp(playerRobot) + earnedXp;
            const currentLevel = playerRobot.level || 1;
            const expToNextLevel = currentLevel * 100;
            let robotUpdates = {
                xp: currentExp,
                totalBattles: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (winnerIsPlayer) {
                robotUpdates.wins = admin.firestore.FieldValue.increment(1);
                robotUpdates.totalWins = admin.firestore.FieldValue.increment(1);
            }
            else if (winnerIsOpponent) {
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
                    const newSkill = (0, skills_1.getRandomSkill)();
                    const currentSkills = (0, skills_1.normalizeSkillIds)(playerRobot.skills);
                    if (!currentSkills.includes(newSkill.id) && currentSkills.length < 4) {
                        currentSkills.push(newSkill.id);
                        robotUpdates.skills = currentSkills;
                        battleResult.rewards.newSkill = newSkill.name;
                    }
                }
            }
            if (!playerRobot.isVariant) {
                transaction.update(db.collection('users').doc(userId).collection('robots').doc(playerRobot.id), robotUpdates);
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
        if (txnReward === null || txnReward === void 0 ? void 0 : txnReward.winnerIsPlayer) {
            try {
                const postTxnTodayKey = (0, dateKey_1.getJstDateKey)();
                const missionsRef = db.collection('users').doc(userId).collection('missions').doc(postTxnTodayKey);
                const missionSnap = await missionsRef.get();
                let missions = buildDailyMissions();
                if (missionSnap.exists) {
                    const data = missionSnap.data();
                    missions = (data && Array.isArray(data.missions)) ? data.missions : missions;
                }
                const updatedMissions = missions.map((m) => {
                    if (m.id === 'win_battle' && !m.claimed) {
                        const currentProgress = typeof m.progress === 'number' ? m.progress : 0;
                        return Object.assign(Object.assign({}, m), { progress: Math.min(m.target || 1, currentProgress + 1) });
                    }
                    return m;
                });
                await missionsRef.set({
                    missions: updatedMissions,
                    dateKey: postTxnTodayKey,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            catch (missionError) {
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
            experienceGained: (_l = txnReward === null || txnReward === void 0 ? void 0 : txnReward.earnedXp) !== null && _l !== void 0 ? _l : 0,
            rankingPointsChange: ratingChange,
            rewards: {
                exp: (_m = txnReward === null || txnReward === void 0 ? void 0 : txnReward.earnedXp) !== null && _m !== void 0 ? _m : 0,
                credits: (_o = txnReward === null || txnReward === void 0 ? void 0 : txnReward.earnedCredits) !== null && _o !== void 0 ? _o : 0,
                xp: (_p = txnReward === null || txnReward === void 0 ? void 0 : txnReward.earnedXp) !== null && _p !== void 0 ? _p : 0,
                coins: (_q = txnReward === null || txnReward === void 0 ? void 0 : txnReward.earnedCredits) !== null && _q !== void 0 ? _q : 0,
                creditsReward: (_s = (_r = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _r === void 0 ? void 0 : _r.creditsReward) !== null && _s !== void 0 ? _s : 0,
                xpReward: (_u = (_t = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _t === void 0 ? void 0 : _t.xpReward) !== null && _u !== void 0 ? _u : 0,
                scanTokensGained: (_w = (_v = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _v === void 0 ? void 0 : _v.scanTokensGained) !== null && _w !== void 0 ? _w : 0,
                xpBefore: (_y = (_x = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _x === void 0 ? void 0 : _x.xpBefore) !== null && _y !== void 0 ? _y : 0,
                xpAfter: (_0 = (_z = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _z === void 0 ? void 0 : _z.xpAfter) !== null && _0 !== void 0 ? _0 : 0,
                levelBefore: (_2 = (_1 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _1 === void 0 ? void 0 : _1.levelBefore) !== null && _2 !== void 0 ? _2 : 1,
                levelAfter: (_4 = (_3 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _3 === void 0 ? void 0 : _3.levelAfter) !== null && _4 !== void 0 ? _4 : 1,
                capped: (_6 = (_5 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _5 === void 0 ? void 0 : _5.capped) !== null && _6 !== void 0 ? _6 : false,
                capRemaining: (_7 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _7 === void 0 ? void 0 : _7.capRemaining,
                reason: (_9 = (_8 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _8 === void 0 ? void 0 : _8.reason) !== null && _9 !== void 0 ? _9 : null,
                dailyCapApplied: (_11 = (_10 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _10 === void 0 ? void 0 : _10.dailyCapApplied) !== null && _11 !== void 0 ? _11 : false,
                dailyCreditsCapApplied: (_13 = (_12 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _12 === void 0 ? void 0 : _12.dailyCreditsCapApplied) !== null && _13 !== void 0 ? _13 : false,
                levelUp: (_14 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.leveledUp) !== null && _14 !== void 0 ? _14 : false,
                newLevel: (_16 = (_15 = txnReward === null || txnReward === void 0 ? void 0 : txnReward.reward) === null || _15 === void 0 ? void 0 : _15.levelAfter) !== null && _16 !== void 0 ? _16 : 1,
                newWorkshopLines: txnReward === null || txnReward === void 0 ? void 0 : txnReward.newWorkshopLines
            }
        };
    }
    catch (error) {
        console.error("Match battle error:", error);
        throw new functions.https.HttpsError('internal', 'Battle failed');
    }
});
// 合成API
exports.synthesizeRobots = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const baseRobotId = data === null || data === void 0 ? void 0 : data.baseRobotId;
    const materialRobotIds = data === null || data === void 0 ? void 0 : data.materialRobotIds;
    if (typeof baseRobotId !== "string" || !Array.isArray(materialRobotIds)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
    }
    const normalizedMaterials = materialRobotIds.filter((id) => typeof id === "string" && id.trim().length > 0);
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
        const baseData = baseSnap.data();
        const baseXp = getRobotXp(baseData);
        const gainedXp = materialSnaps.reduce((total, snap) => {
            const material = snap.data();
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
        const postTxnTodayKey = (0, dateKey_1.getJstDateKey)();
        const missionsRef = admin.firestore().collection('users').doc(userId).collection('missions').doc(postTxnTodayKey);
        const missionSnap = await missionsRef.get();
        let missions = buildDailyMissions();
        if (missionSnap.exists) {
            const data = missionSnap.data();
            missions = (data && Array.isArray(data.missions)) ? data.missions : missions;
        }
        const updatedMissions = missions.map((m) => {
            if (m.id === 'synthesize' && !m.claimed) {
                const currentProgress = typeof m.progress === 'number' ? m.progress : 0;
                return Object.assign(Object.assign({}, m), { progress: Math.min(m.target || 1, currentProgress + 1) });
            }
            return m;
        });
        await missionsRef.set({
            missions: updatedMissions,
            dateKey: postTxnTodayKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    catch (missionError) {
        console.error('Mission update failed (non-critical):', missionError);
        // Non-critical failure - don't throw
    }
    return result;
});
// 継承API
exports.inheritSkill = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const baseRobotId = data === null || data === void 0 ? void 0 : data.baseRobotId;
    const materialRobotId = data === null || data === void 0 ? void 0 : data.materialRobotId;
    const skillId = data === null || data === void 0 ? void 0 : data.skillId;
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
        const baseData = baseSnap.data();
        const materialData = materialSnap.data();
        const baseSkills = (0, skills_1.normalizeSkillIds)(baseData.skills);
        const materialSkills = (0, skills_1.normalizeSkillIds)(materialData.skills);
        if (!materialSkills.includes(skillId)) {
            throw new functions.https.HttpsError('failed-precondition', 'Material robot does not have the skill');
        }
        if (baseSkills.includes(skillId)) {
            throw new functions.https.HttpsError('already-exists', 'Base robot already has the skill');
        }
        if (baseSkills.length >= MAX_SKILLS) {
            throw new functions.https.HttpsError('failed-precondition', 'Base robot has reached the skill limit');
        }
        const success = ((0, crypto_1.randomInt)(0, 1000000) / 1000000) < INHERIT_SUCCESS_RATE;
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
exports.purchaseItem = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const itemId = data === null || data === void 0 ? void 0 : data.itemId;
    const qty = data === null || data === void 0 ? void 0 : data.qty;
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
        var _a, _b;
        const userSnap = await t.get(userRef);
        const userData = userSnap.exists ? userSnap.data() : {};
        const credits = getUserCredits(userData);
        const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
        if (credits < cost) {
            throw new functions.https.HttpsError('failed-precondition', 'insufficient-funds');
        }
        const inventorySnap = await t.get(inventoryRef);
        const currentQty = inventorySnap.exists && typeof ((_a = inventorySnap.data()) === null || _a === void 0 ? void 0 : _a.qty) === "number"
            ? (_b = inventorySnap.data()) === null || _b === void 0 ? void 0 : _b.qty
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
exports.equipItem = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const robotId = data === null || data === void 0 ? void 0 : data.robotId;
    const slot = data === null || data === void 0 ? void 0 : data.slot;
    const rawItemId = data === null || data === void 0 ? void 0 : data.itemId;
    const itemId = typeof rawItemId === "string" && rawItemId.trim().length > 0
        ? rawItemId
        : undefined;
    if (typeof robotId !== "string" || (slot !== "slot1" && slot !== "slot2")) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
    }
    if (itemId && !isItemId(itemId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Unknown item');
    }
    const slotKey = slot;
    const userId = context.auth.uid;
    const userRef = admin.firestore().collection('users').doc(userId);
    const robotRef = userRef.collection('robots').doc(robotId);
    const inventoryCollection = userRef.collection('inventory');
    const result = await admin.firestore().runTransaction(async (t) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const robotSnap = await t.get(robotRef);
        if (!robotSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Robot not found');
        }
        const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
        const robotData = robotSnap.data();
        const equipped = ((_a = robotData.equipped) !== null && _a !== void 0 ? _a : {});
        const currentItem = (_b = equipped[slotKey]) !== null && _b !== void 0 ? _b : null;
        const inventoryUpdates = {};
        if (!itemId) {
            if (!currentItem) {
                return { equipped, inventory: inventoryUpdates };
            }
            const returnRef = inventoryCollection.doc(currentItem);
            const returnSnap = await t.get(returnRef);
            const returnQty = returnSnap.exists && typeof ((_c = returnSnap.data()) === null || _c === void 0 ? void 0 : _c.qty) === "number"
                ? (_d = returnSnap.data()) === null || _d === void 0 ? void 0 : _d.qty
                : 0;
            const newReturnQty = returnQty + 1;
            t.set(returnRef, { itemId: currentItem, qty: newReturnQty, updatedAt: serverTimestamp }, { merge: true });
            t.update(robotRef, {
                [`equipped.${slotKey}`]: null,
                updatedAt: serverTimestamp
            });
            inventoryUpdates[currentItem] = newReturnQty;
            return { equipped: Object.assign(Object.assign({}, equipped), { [slotKey]: null }), inventory: inventoryUpdates };
        }
        if (itemId === currentItem) {
            return { equipped, inventory: inventoryUpdates };
        }
        const equipRef = inventoryCollection.doc(itemId);
        const equipSnap = await t.get(equipRef);
        const equipQty = equipSnap.exists && typeof ((_e = equipSnap.data()) === null || _e === void 0 ? void 0 : _e.qty) === "number"
            ? (_f = equipSnap.data()) === null || _f === void 0 ? void 0 : _f.qty
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
            const returnQty = returnSnap.exists && typeof ((_g = returnSnap.data()) === null || _g === void 0 ? void 0 : _g.qty) === "number"
                ? (_h = returnSnap.data()) === null || _h === void 0 ? void 0 : _h.qty
                : 0;
            const newReturnQty = returnQty + 1;
            t.set(returnRef, { itemId: currentItem, qty: newReturnQty, updatedAt: serverTimestamp }, { merge: true });
            inventoryUpdates[currentItem] = newReturnQty;
        }
        const nextEquipped = Object.assign(Object.assign({}, equipped), { [slotKey]: itemId });
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
exports.claimDailyLogin = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const userId = context.auth.uid;
    const userRef = admin.firestore().collection('users').doc(userId);
    const todayKey = (0, dateKey_1.getJstDateKey)();
    const yesterdayKey = (0, dateKey_1.getYesterdayJstDateKey)();
    const result = await admin.firestore().runTransaction(async (t) => {
        const userSnap = await t.get(userRef);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'User not found');
        }
        const userData = userSnap.data() || {};
        const lastDailyClaimDateKey = typeof (userData === null || userData === void 0 ? void 0 : userData.lastDailyClaimDateKey) === "string"
            ? userData.lastDailyClaimDateKey
            : userData === null || userData === void 0 ? void 0 : userData.lastLoginDateKey;
        const isPremium = !!(userData === null || userData === void 0 ? void 0 : userData.isPremium);
        const bonusAmount = isPremium ? LOGIN_BONUS_CREDITS * 2 : LOGIN_BONUS_CREDITS;
        const resolved = (0, dailyLogin_1.resolveDailyLogin)({
            todayKey,
            yesterdayKey,
            bonusAmount,
            state: {
                lastDailyClaimDateKey,
                loginStreak: userData === null || userData === void 0 ? void 0 : userData.loginStreak,
                maxLoginStreak: userData === null || userData === void 0 ? void 0 : userData.maxLoginStreak,
                badgeIds: userData === null || userData === void 0 ? void 0 : userData.badgeIds,
                titleId: userData === null || userData === void 0 ? void 0 : userData.titleId,
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
exports.claimLoginBonus = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const userId = context.auth.uid;
    const userRef = admin.firestore().collection('users').doc(userId);
    const todayKey = (0, dateKey_1.getJstDateKey)();
    const yesterdayKey = (0, dateKey_1.getYesterdayJstDateKey)();
    const result = await admin.firestore().runTransaction(async (t) => {
        const userSnap = await t.get(userRef);
        const userData = userSnap.exists ? userSnap.data() : {};
        const lastDailyClaimDateKey = typeof (userData === null || userData === void 0 ? void 0 : userData.lastDailyClaimDateKey) === "string"
            ? userData.lastDailyClaimDateKey
            : userData === null || userData === void 0 ? void 0 : userData.lastLoginDateKey;
        const isPremium = !!(userData === null || userData === void 0 ? void 0 : userData.isPremium);
        const bonusAmount = isPremium ? LOGIN_BONUS_CREDITS * 2 : LOGIN_BONUS_CREDITS;
        const resolved = (0, dailyLogin_1.resolveDailyLogin)({
            todayKey,
            yesterdayKey,
            bonusAmount,
            state: {
                lastDailyClaimDateKey,
                loginStreak: userData === null || userData === void 0 ? void 0 : userData.loginStreak,
                maxLoginStreak: userData === null || userData === void 0 ? void 0 : userData.maxLoginStreak,
                badgeIds: userData === null || userData === void 0 ? void 0 : userData.badgeIds,
                titleId: userData === null || userData === void 0 ? void 0 : userData.titleId,
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
exports.getDailyMissions = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const userId = context.auth.uid;
    const userRef = admin.firestore().collection('users').doc(userId);
    const dateKey = (0, dateKey_1.getJstDateKey)();
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
exports.claimMissionReward = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const dateKey = data === null || data === void 0 ? void 0 : data.dateKey;
    const missionId = data === null || data === void 0 ? void 0 : data.missionId;
    if (typeof dateKey !== "string" || typeof missionId !== "string") {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
    }
    const todayKey = (0, dateKey_1.getJstDateKey)();
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
        const missionIndex = missions.findIndex((mission) => (mission === null || mission === void 0 ? void 0 : mission.id) === missionId);
        if (missionIndex === -1) {
            throw new functions.https.HttpsError('not-found', 'Mission not found');
        }
        const mission = missions[missionIndex];
        const claimed = (mission === null || mission === void 0 ? void 0 : mission.claimed) === true;
        const progress = typeof (mission === null || mission === void 0 ? void 0 : mission.progress) === "number" ? mission.progress : 0;
        const target = typeof (mission === null || mission === void 0 ? void 0 : mission.target) === "number" ? mission.target : 0;
        if (claimed) {
            throw new functions.https.HttpsError('failed-precondition', 'Mission already claimed');
        }
        if (progress < target) {
            throw new functions.https.HttpsError('failed-precondition', 'Mission not completed');
        }
        const rewardCredits = typeof (mission === null || mission === void 0 ? void 0 : mission.rewardCredits) === "number" ? mission.rewardCredits : 0;
        const credits = getUserCredits(userSnap.exists ? userSnap.data() : {});
        const newCredits = credits + rewardCredits;
        const nextMissions = missions.map((entry, index) => {
            if (index !== missionIndex)
                return entry;
            return Object.assign(Object.assign({}, entry), { claimed: true });
        });
        t.set(missionsRef, { missions: nextMissions }, { merge: true });
        t.set(userRef, { credits: newCredits }, { merge: true });
        return { credits: newCredits, missionId };
    });
    return result;
});
// Stripe functions are exported later
// フォローAPI
exports.followUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const targetUid = data === null || data === void 0 ? void 0 : data.targetUid;
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
exports.updateRanking = (0, scheduler_1.onSchedule)({ schedule: '0 0 * * *', timeZone: 'Asia/Tokyo' }, async (event) => {
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
exports.checkAchievements = (0, firestore_1.onDocumentUpdated)('users/{userId}', async (event) => {
    var _a, _b;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    const userId = event.params.userId;
    if (!beforeData || !afterData)
        return;
    const db = admin.firestore();
    // 変更を検出
    const changes = {
        totalWins: (afterData.totalWins || 0) - (beforeData.totalWins || 0),
        currentWinStreak: afterData.currentWinStreak || 0,
        rankingPoints: afterData.rankingPoints || 0
    };
    const unlockAchievement = async (achievementId) => {
        var _a;
        const achievementRef = db
            .collection('users').doc(userId)
            .collection('achievements').doc(String(achievementId));
        const achievementSnap = await achievementRef.get();
        if (!achievementSnap.exists || !((_a = achievementSnap.data()) === null || _a === void 0 ? void 0 : _a.isCompleted)) {
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
};
const isUpgradeItemId = (id) => {
    return Object.prototype.hasOwnProperty.call(UPGRADE_ITEMS, id);
};
// コスメティックアイテムの定義
const COSMETIC_ITEMS = ['gold_coating', 'neon_glow', 'flame_aura', 'ice_armor'];
const isCosmeticItemId = (id) => {
    return COSMETIC_ITEMS.includes(id);
};
// クラフトAPI (ScanToken + Credits)
exports.craftItem = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const recipeId = typeof (data === null || data === void 0 ? void 0 : data.recipeId) === "string"
        ? data.recipeId
        : (typeof (data === null || data === void 0 ? void 0 : data.itemId) === "string" ? data.itemId : null);
    const qty = typeof (data === null || data === void 0 ? void 0 : data.qty) === "number" ? data.qty : 1;
    if (typeof recipeId !== "string") {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid input');
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid quantity');
    }
    if (!(0, crafting_1.isCraftItemId)(recipeId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Unknown craft item');
    }
    const userId = context.auth.uid;
    const userRef = admin.firestore().collection('users').doc(userId);
    const inventoryRef = userRef.collection('inventory').doc(recipeId);
    const { totalTokenCost, totalCreditCost } = (0, crafting_1.getCraftCosts)(recipeId, qty);
    const result = await admin.firestore().runTransaction(async (t) => {
        var _a, _b;
        const userSnap = await t.get(userRef);
        const userData = userSnap.exists ? userSnap.data() : {};
        const scanTokens = typeof (userData === null || userData === void 0 ? void 0 : userData.scanTokens) === "number" ? userData.scanTokens : 0;
        const credits = getUserCredits(userData);
        const inventorySnap = await t.get(inventoryRef);
        const currentQty = inventorySnap.exists && typeof ((_a = inventorySnap.data()) === null || _a === void 0 ? void 0 : _a.qty) === "number"
            ? (_b = inventorySnap.data()) === null || _b === void 0 ? void 0 : _b.qty
            : 0;
        const craftResult = (0, crafting_1.applyCraftBalances)({
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
        t.set(ledgerRef, Object.assign(Object.assign({}, (0, ledger_1.buildLedgerEntry)({
            type: "CRAFT",
            deltaCredits: -totalCreditCost,
            deltaScanTokens: -totalTokenCost,
            refId: `craft:${recipeId}:${qty}`
        })), { createdAt: serverTimestamp }));
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
exports.useUpgradeItem = functions.https.onCall(async (data, context) => {
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
        var _a, _b;
        const [robotSnap, inventorySnap] = await Promise.all([
            t.get(robotRef),
            t.get(inventoryRef)
        ]);
        if (!robotSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'ロボットが見つかりません');
        }
        const inventoryData = inventorySnap.data();
        const qty = (_a = inventoryData === null || inventoryData === void 0 ? void 0 : inventoryData.qty) !== null && _a !== void 0 ? _a : 0;
        if (qty < 1) {
            throw new functions.https.HttpsError('failed-precondition', 'アイテムが不足しています');
        }
        const robotData = robotSnap.data();
        const item = UPGRADE_ITEMS[itemId];
        const currentValue = (_b = robotData[item.stat]) !== null && _b !== void 0 ? _b : 0;
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
exports.applyCosmeticItem = functions.https.onCall(async (data, context) => {
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
        var _a;
        const [robotSnap, inventorySnap] = await Promise.all([
            t.get(robotRef),
            t.get(inventoryRef)
        ]);
        if (!robotSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'ロボットが見つかりません');
        }
        const inventoryData = inventorySnap.data();
        const qty = (_a = inventoryData === null || inventoryData === void 0 ? void 0 : inventoryData.qty) !== null && _a !== void 0 ? _a : 0;
        if (qty < 1) {
            throw new functions.https.HttpsError('failed-precondition', 'アイテムが不足しています');
        }
        const robotData = robotSnap.data();
        const currentCosmetics = robotData.cosmetics || [];
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
const stripe_1 = require("stripe");
const params_1 = require("firebase-functions/params");
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
// Stripe Price IDs（Stripeダッシュボードで作成済み）
const STRIPE_PRICES = {
    credits_100: { priceId: 'price_1SjPcuRy3cnjpOGFNMSku9Op', credits: 100 },
    credits_500: { priceId: 'price_1SjPsxRy3cnjpOGFK5rCDh9q', credits: 500 },
    credits_1200: { priceId: 'price_1SjPqhRy3cnjpOGF1EIsZba4', credits: 1200 },
    premium_monthly: { priceId: 'price_1SkiWvRy3cnjpOGFW3lhDJSZ' },
};
const isCreditPackId = (id) => {
    return id === 'credits_100' || id === 'credits_500' || id === 'credits_1200';
};
// Stripe Checkout セッション作成（クレジットパック購入）
exports.createCheckoutSession = functions
    .runWith({ secrets: [stripeSecretKey] })
    .https.onCall(async (data, context) => {
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
    const stripe = new stripe_1.default(stripeSecretKey.value(), { apiVersion: '2025-12-15.clover' });
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
    }
    catch (error) {
        console.error('Stripe checkout error:', error);
        throw new functions.https.HttpsError('internal', '決済セッションの作成に失敗しました');
    }
});
// Stripe Checkout セッション作成（プレミアム会員サブスク）
exports.createSubscriptionSession = functions
    .runWith({ secrets: [stripeSecretKey] })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }
    const { successUrl, cancelUrl } = data;
    if (!successUrl || !cancelUrl) {
        throw new functions.https.HttpsError('invalid-argument', '必要なパラメータが不足しています');
    }
    const userId = context.auth.uid;
    const stripe = new stripe_1.default(stripeSecretKey.value(), { apiVersion: '2025-12-15.clover' });
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
    }
    catch (error) {
        console.error('Stripe subscription error:', error);
        throw new functions.https.HttpsError('internal', 'サブスクリプションセッションの作成に失敗しました');
    }
});
// Stripe カスタマーポータルセッション作成
exports.createPortalSession = functions
    .runWith({ secrets: [stripeSecretKey] })
    .https.onCall(async (data, context) => {
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
    const stripeCustomerId = userData === null || userData === void 0 ? void 0 : userData.stripeCustomerId;
    if (!stripeCustomerId) {
        throw new functions.https.HttpsError('failed-precondition', 'サブスクリプション情報が見つかりません');
    }
    const stripe = new stripe_1.default(stripeSecretKey.value(), { apiVersion: '2025-12-15.clover' });
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: returnUrl,
        });
        return { url: session.url };
    }
    catch (error) {
        console.error('Portal session error:', error);
        throw new functions.https.HttpsError('internal', 'ポータルセッションの作成に失敗しました');
    }
});
// Stripe Webhook（決済完了時の処理）
const stripeWebhookSecret = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
exports.stripeWebhook = functions
    .runWith({ secrets: [stripeSecretKey, stripeWebhookSecret] })
    .https.onRequest(async (req, res) => {
    const stripe = new stripe_1.default(stripeSecretKey.value(), { apiVersion: '2025-12-15.clover' });
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        res.status(400).send('Missing stripe-signature');
        return;
    }
    let event;
    try {
        // Webhook署名検証
        event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    }
    catch (err) {
        console.error('Webhook verification failed:', err);
        res.status(400).send('Webhook signature verification failed');
        return;
    }
    const db = admin.firestore();
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
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
                    }
                    else if (type === 'premium_subscription') {
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
                const subscription = event.data.object;
                const customerId = subscription.customer;
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
                }
                else {
                    console.warn(`User not found for cancelled subscription (Customer: ${customerId})`);
                    // エラーを投げずログのみ。リトライしてもユーザーが見つかるわけではないため。
                }
                break;
            }
            case 'customer.subscription.updated': {
                // サブスク更新時（cancel_at_period_end変更、ステータス変更など）
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const status = subscription.status; // active, past_due, canceled, etc.
                const cancelAtPeriodEnd = subscription.cancel_at_period_end;
                const usersUpdSnap = await db.collection('users')
                    .where('stripeCustomerId', '==', customerId)
                    .limit(1)
                    .get();
                if (!usersUpdSnap.empty) {
                    const userDoc = usersUpdSnap.docs[0];
                    const updateData = {
                        subscriptionStatus: status,
                        cancelAtPeriodEnd: cancelAtPeriodEnd,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    };
                    // active/trialing は isPremium: true, それ以外は false
                    if (status === 'active' || status === 'trialing') {
                        updateData.isPremium = true;
                    }
                    else if (status === 'canceled' || status === 'unpaid') {
                        updateData.isPremium = false;
                    }
                    // past_due は isPremium を維持（猶予期間）
                    if (subscription.current_period_end) {
                        updateData.currentPeriodEnd = admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000);
                    }
                    await userDoc.ref.update(updateData);
                    console.log(`Subscription updated for user ${userDoc.id}: status=${status}, cancelAtPeriodEnd=${cancelAtPeriodEnd}`);
                }
                else {
                    console.warn(`User not found for subscription update (Customer: ${customerId})`);
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                // 支払い成功時（更新支払いも含む）
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const subscriptionId = invoice.subscription;
                if (subscriptionId) {
                    const usersInvSnap = await db.collection('users')
                        .where('stripeCustomerId', '==', customerId)
                        .limit(1)
                        .get();
                    if (!usersInvSnap.empty) {
                        const userDoc = usersInvSnap.docs[0];
                        await userDoc.ref.update({
                            isPremium: true,
                            subscriptionStatus: 'active',
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`Invoice payment succeeded for user ${userDoc.id}`);
                    }
                }
                break;
            }
            case 'invoice.payment_failed': {
                // 支払い失敗時
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const subscriptionId = invoice.subscription;
                if (subscriptionId) {
                    const usersFailSnap = await db.collection('users')
                        .where('stripeCustomerId', '==', customerId)
                        .limit(1)
                        .get();
                    if (!usersFailSnap.empty) {
                        const userDoc = usersFailSnap.docs[0];
                        await userDoc.ref.update({
                            subscriptionStatus: 'past_due',
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`Invoice payment failed for user ${userDoc.id}, marked as past_due`);
                    }
                }
                break;
            }
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Webhook processing failed');
    }
});
// ====================
// オンラインマッチメイキング
// ====================
const MATCHMAKING_RATING_RANGE = 200; // ±200のレーティング差まで許容
const MATCHMAKING_TIMEOUT_MS = 30000; // 30秒でタイムアウト
const sendBattleNotification = async (userId, title, body) => {
    const db = admin.firestore();
    const tokensSnap = await db.collection('users').doc(userId).collection('fcmTokens').get();
    if (tokensSnap.empty)
        return;
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
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            // Optionally delete invalid tokens here
        }
    }
    catch (error) {
        console.error('Error sending notification:', error);
    }
};
exports.joinMatchmaking = functions.https.onCall(async (data, context) => {
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
                        robotName: (robotData === null || robotData === void 0 ? void 0 : robotData.name) || 'Robot',
                        rating: playerRating,
                    },
                    status: 'ready',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
            // Notify opponent
            await sendBattleNotification(opponentData.userId, "Battle Start!", `A battle against ${userData.displayName || 'Player'} has started!`);
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
        }
        else {
            // マッチング相手がいない → キューに追加
            const queueRef = await db.collection('matchmaking_queue').add({
                userId: userId,
                userName: userData.displayName || 'Player',
                robotId: robotId,
                robotName: (robotData === null || robotData === void 0 ? void 0 : robotData.name) || 'Robot',
                rating: playerRating,
                status: 'waiting',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { status: 'waiting', queueId: queueRef.id };
        }
    }
    catch (error) {
        console.error('joinMatchmaking error:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Matchmaking failed');
    }
});
exports.leaveMatchmaking = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const userId = context.auth.uid;
    const db = admin.firestore();
    try {
        // キューIDが指定されていればそれを削除、なければユーザーのすべての待機中エントリを削除
        if (data.queueId) {
            const queueDoc = await db.collection('matchmaking_queue').doc(data.queueId).get();
            if (queueDoc.exists && ((_a = queueDoc.data()) === null || _a === void 0 ? void 0 : _a.userId) === userId) {
                await queueDoc.ref.delete();
            }
        }
        else {
            const userQueues = await db.collection('matchmaking_queue')
                .where('userId', '==', userId)
                .where('status', '==', 'waiting')
                .get();
            const batch = db.batch();
            userQueues.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        return { success: true };
    }
    catch (error) {
        console.error('leaveMatchmaking error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to leave matchmaking');
    }
});
// オンラインバトルのステータスをチェック（ポーリング用）
exports.checkMatchStatus = functions.https.onCall(async (data, context) => {
    var _a;
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
        const queueData = queueDoc.data();
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
        const createdAt = ((_a = queueData.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
        if (Date.now() - createdAt > MATCHMAKING_TIMEOUT_MS) {
            await queueDoc.ref.delete();
            return { status: 'timeout' };
        }
        return { status: 'waiting' };
    }
    catch (error) {
        console.error('checkMatchStatus error:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to check match status');
    }
});
// Gemini API Barcode Scanner
var geminiScanner_1 = require("./geminiScanner");
Object.defineProperty(exports, "scanBarcodeFromImage", { enumerable: true, get: function () { return geminiScanner_1.scanBarcodeFromImage; } });
// ============================================
// Variant System Functions
// ============================================
exports.createVariant = functions.https.onCall(async (data, context) => {
    const db = admin.firestore();
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    const uid = context.auth.uid;
    const { robotIdA, robotIdB, name } = data;
    if (!robotIdA || !robotIdB)
        throw new functions.https.HttpsError('invalid-argument', 'Missing parents');
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
        if (!rA.exists || !rB.exists)
            throw new functions.https.HttpsError('not-found', 'Parent not found');
        const userData = userDoc.data() || {};
        // Calculate capacity including milestone bonuses
        const userLevel = typeof userData.level === 'number' ? userData.level : 1;
        const clearedMilestones = Array.isArray(userData.clearedMilestones) ? userData.clearedMilestones : [];
        const limit = (0, levelSystem_1.getWorkshopCapacity)(userLevel, clearedMilestones);
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
        }
        else {
            if ((userData.credits || 0) < VARIANT_COST) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits');
            }
            chargedCredits = VARIANT_COST;
        }
        // 4. Generate Recipe
        const recipe = (0, variantSystem_1.generateVariantRecipe)(uid, robotIdA, robotIdB);
        const sortedIds = [robotIdA, robotIdB].sort();
        const pA = sortedIds[0] === robotIdA ? rA : rB;
        const pB = sortedIds[1] === robotIdA ? rA : rB;
        const appearance = (0, variantSystem_1.resolveVariantAppearance)(recipe, pA.data(), pB.data());
        const variantRef = db.collection('users').doc(uid).collection('variants').doc();
        const variantData = {
            id: variantRef.id,
            name: (name === null || name === void 0 ? void 0 : name.slice(0, 20)) || `Variant ${variantRef.id.slice(0, 4)}`,
            parentRobotIds: [sortedIds[0], sortedIds[1]],
            appearanceRecipe: recipe,
            parts: appearance.parts,
            colors: appearance.colors,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // 5. Writes - sanitize to remove undefined values (e.g. overlayKey)
        t.set(variantRef, sanitizeForFirestore(variantData));
        const userUpdates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (isFree) {
            userUpdates.lastFreeVariantDate = nowJST;
        }
        else {
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
/**
 * Delete a variant from user's collection
 * Frees up workshop capacity
 */
exports.deleteVariant = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { variantId } = data;
    if (!variantId || typeof variantId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'variantId is required');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const variantRef = db.collection('users').doc(uid).collection('variants').doc(variantId);
    const variantDoc = await variantRef.get();
    if (!variantDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Variant not found');
    }
    // Delete the variant
    await variantRef.delete();
    console.log(`[deleteVariant] User ${uid} deleted variant ${variantId}`);
    return {
        success: true,
        deletedVariantId: variantId
    };
});
async function resolveFighterData(uid, ref, transaction) {
    var _a;
    const db = admin.firestore();
    const id = typeof ref === 'string' ? ref : ref.id;
    const kind = typeof ref === 'string' ? 'robot' : ref.kind;
    if (kind === 'robot') {
        const docRef = db.collection('users').doc(uid).collection('robots').doc(id);
        const doc = transaction ? await transaction.get(docRef) : await docRef.get();
        if (!doc.exists)
            throw new functions.https.HttpsError('not-found', 'Robot not found');
        return Object.assign(Object.assign({}, doc.data()), { id: doc.id });
    }
    else {
        const docRef = db.collection('users').doc(uid).collection('variants').doc(id);
        const vDoc = transaction ? await transaction.get(docRef) : await docRef.get();
        if (!vDoc.exists)
            throw new functions.https.HttpsError('not-found', 'Variant not found');
        const vData = vDoc.data();
        const p1Ref = db.collection('users').doc(uid).collection('robots').doc(vData.parentRobotIds[0]);
        const p2Ref = db.collection('users').doc(uid).collection('robots').doc(vData.parentRobotIds[1]);
        const [p1, p2] = await Promise.all([
            transaction ? transaction.get(p1Ref) : p1Ref.get(),
            transaction ? transaction.get(p2Ref) : p2Ref.get()
        ]);
        if (!p1.exists || !p2.exists)
            throw new functions.https.HttpsError('failed-precondition', 'Parent robot missing');
        const rA = Object.assign(Object.assign({}, p1.data()), { id: p1.id });
        const rB = Object.assign(Object.assign({}, p2.data()), { id: p2.id });
        const stats = (0, variantSystem_1.resolveVariantStats)(rA, rB);
        const appearance = (0, variantSystem_1.resolveVariantAppearance)(vData.appearanceRecipe, rA, rB);
        return Object.assign(Object.assign({ id: vData.id, userId: uid, name: `Variant ${(_a = vData.id) === null || _a === void 0 ? void 0 : _a.slice(0, 4)}`, sourceBarcode: 'FUSION' }, stats), { parts: appearance.parts, colors: appearance.colors, skills: rA.skills, isVariant: true, variantId: vData.id, totalBattles: 0, totalWins: 0, isFavorite: false, level: rA.level || 1, xp: 0 });
    }
}
exports.resolveFighterData = resolveFighterData;
// ============================================
// Daily Boss (PvE) System
// ============================================
// Boss battle reward constants
const BOSS_XP_WIN = 50;
const BOSS_XP_LOSE = 15;
const BOSS_CREDITS_WIN = 10;
const BOSS_SCAN_TOKENS_WIN_MIN = 1;
const BOSS_SCAN_TOKENS_WIN_MAX = 3;
/**
 * Get today's daily boss information
 * Returns boss data and whether user can challenge
 */
exports.getDailyBoss = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (_data, context) => {
    const db = admin.firestore();
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const todayKey = (0, dateKey_1.getJstDateKey)();
    // Generate today's boss (deterministic)
    const boss = (0, dailyBoss_1.generateDailyBoss)(todayKey);
    // Check if user has already attempted today
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const lastDateKey = userData.dailyBossLastDateKey || '';
    const attempts = lastDateKey === todayKey ? (userData.dailyBossAttempts || 0) : 0;
    // Check if user has scanned today
    const scanDailyDoc = await db.collection('users').doc(uid).collection('scanDaily').doc(todayKey).get();
    const hasScannedToday = scanDailyDoc.exists;
    // canChallenge requires: not attempted today AND scanned today
    const canChallenge = attempts < 1 && hasScannedToday;
    return {
        boss,
        canChallenge,
        hasScannedToday,
        attempts,
        todayKey,
    };
});
/**
 * Execute a boss battle
 * Validates 1-per-day limit, runs battle, grants rewards
 */
exports.executeBossBattle = functions
    .runWith({ memory: '512MB', timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
    const db = admin.firestore();
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const { robotId, variantId, useCheer, useSpecial } = data;
    if (!robotId && !variantId) {
        throw new functions.https.HttpsError('invalid-argument', 'robotId or variantId required');
    }
    const todayKey = (0, dateKey_1.getJstDateKey)();
    const boss = (0, dailyBoss_1.generateDailyBoss)(todayKey);
    const battleId = `boss_${uid}_${todayKey}`;
    // Run transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
        var _a;
        const userRef = db.collection('users').doc(uid);
        const battleRef = db.collection('bossBattles').doc(battleId);
        const [userSnap, battleSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(battleRef)
        ]);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const userData = userSnap.data() || {};
        // Check idempotency - already completed this battle
        if (battleSnap.exists && ((_a = battleSnap.data()) === null || _a === void 0 ? void 0 : _a.rewardGranted)) {
            const existingResult = battleSnap.data();
            return Object.assign({ alreadyCompleted: true }, existingResult);
        }
        // Check 1-per-day limit
        const lastDateKey = userData.dailyBossLastDateKey || '';
        const attempts = lastDateKey === todayKey ? (userData.dailyBossAttempts || 0) : 0;
        if (attempts >= 1) {
            throw new functions.https.HttpsError('failed-precondition', 'already-challenged-today');
        }
        // Check if user has scanned today (server-side validation to prevent bypass)
        const scanDailyRef = userRef.collection('scanDaily').doc(todayKey);
        const scanDailySnap = await transaction.get(scanDailyRef);
        if (!scanDailySnap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'scan-required-today');
        }
        // Get player's robot
        let playerRobot;
        if (variantId) {
            const variantRef = userRef.collection('variants').doc(variantId);
            const variantSnap = await transaction.get(variantRef);
            if (!variantSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'Variant not found');
            }
            // Resolve variant to robot data
            playerRobot = await (0, variantSystem_1.resolveVariant)(uid, variantId, db, transaction);
        }
        else {
            const robotRef = userRef.collection('robots').doc(robotId);
            const robotSnap = await transaction.get(robotRef);
            if (!robotSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'Robot not found');
            }
            playerRobot = Object.assign(Object.assign({}, robotSnap.data()), { id: robotSnap.id });
        }
        // Convert boss to RobotData for battle engine
        const bossRobot = (0, dailyBoss_1.bossToRobotData)(boss);
        const bossTraits = (0, dailyBoss_1.getBossTraits)(boss);
        // Cheer input (player only)
        const cheerInput = useCheer ? { p1: true, p2: false } : undefined;
        // Special move input (player only)
        const specialMoveInput = useSpecial ? { p1Used: true, p2Used: false } : undefined;
        // Execute battle
        const battleResult = (0, battleSystem_1.simulateBattle)(playerRobot, bossRobot, battleId, [], // No legacy items
        cheerInput, undefined, // No battle items for boss
        specialMoveInput, bossTraits // Pass boss traits for SHIELD mechanics
        );
        const isWin = battleResult.winnerId === playerRobot.id;
        // Calculate rewards
        const rng = new seededRandom_1.SeededRandom(`${battleId}_reward`);
        const xpReward = isWin ? BOSS_XP_WIN : BOSS_XP_LOSE;
        let creditsReward = 0;
        let scanTokensReward = 0;
        if (isWin) {
            // Check daily credits cap
            const dailyCreditsEarned = userData.dailyBattleCreditsEarned || 0;
            const dailyDateKey = userData.dailyBattleDateKey || '';
            const effectiveCredits = dailyDateKey === todayKey ? dailyCreditsEarned : 0;
            const creditsRemaining = Math.max(0, battleRewards_1.DAILY_CREDITS_CAP - effectiveCredits);
            creditsReward = Math.min(BOSS_CREDITS_WIN, creditsRemaining);
            // Scan tokens (1-3 for boss win)
            scanTokensReward = rng.nextInt(BOSS_SCAN_TOKENS_WIN_MIN, BOSS_SCAN_TOKENS_WIN_MAX);
        }
        // Calculate new XP and level
        const currentXp = typeof userData.xp === 'number' ? userData.xp : 0;
        const newXp = currentXp + xpReward;
        const newLevel = (0, battleRewards_1.levelFromXp)(newXp);
        // Update user document
        const userUpdate = {
            dailyBossLastDateKey: todayKey,
            dailyBossAttempts: 1,
            xp: admin.firestore.FieldValue.increment(xpReward),
            level: newLevel,
        };
        if (creditsReward > 0) {
            userUpdate.credits = admin.firestore.FieldValue.increment(creditsReward);
            userUpdate.dailyBattleDateKey = todayKey;
            userUpdate.dailyBattleCreditsEarned = admin.firestore.FieldValue.increment(creditsReward);
        }
        if (scanTokensReward > 0) {
            userUpdate.scanTokens = admin.firestore.FieldValue.increment(scanTokensReward);
        }
        transaction.update(userRef, userUpdate);
        // Create battle record
        const battleRecord = {
            bossId: boss.bossId,
            bossName: boss.name,
            bossType: boss.type,
            playerId: uid,
            playerRobotId: robotId || variantId,
            result: isWin ? 'win' : 'loss',
            winnerId: battleResult.winnerId,
            logs: battleResult.logs.map(stripItemFields),
            rewards: {
                xp: xpReward,
                credits: creditsReward,
                scanTokens: scanTokensReward,
            },
            rewardGranted: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        transaction.set(battleRef, battleRecord);
        return {
            battleId,
            result: isWin ? 'win' : 'loss',
            winnerId: battleResult.winnerId,
            logs: battleResult.logs.map(stripItemFields),
            rewards: {
                xp: xpReward,
                credits: creditsReward,
                scanTokens: scanTokensReward,
            },
            bossShieldBroken: boss.type === 'SHIELD' && battleResult.logs.some(l => l.bossShieldBroken),
            turnCount: battleResult.turnCount,
        };
    });
    return result;
});
// ============================================
// Milestone Boss (Rank-up Exam) Functions
// ============================================
/**
 * Get milestone boss status for the user
 * Returns which milestones are locked/available/cleared
 */
exports.getMilestoneBoss = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (_data, context) => {
    const db = admin.firestore();
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const userLevel = typeof userData.level === 'number' ? userData.level : 1;
    const clearedMilestones = Array.isArray(userData.clearedMilestones)
        ? userData.clearedMilestones
        : [];
    // Build milestone status list
    const milestones = levelSystem_1.MILESTONE_LEVELS.map(level => {
        const levelStr = String(level);
        const cleared = clearedMilestones.includes(levelStr);
        const canChallenge = userLevel >= level && !cleared;
        return {
            level,
            cleared,
            canChallenge,
            locked: userLevel < level,
        };
    });
    // Find next available (challengeable) milestone
    const nextMilestone = milestones.find(m => m.canChallenge) || null;
    // Generate boss data for next challengeable milestone
    let bossData = null;
    if (nextMilestone) {
        // Use milestone level as seed for deterministic boss generation
        const seed = `milestone_${nextMilestone.level}`;
        bossData = generateMilestoneBoss(nextMilestone.level, seed);
    }
    return {
        userLevel,
        milestones,
        nextMilestone: (nextMilestone === null || nextMilestone === void 0 ? void 0 : nextMilestone.level) || null,
        bossData,
        currentCapacity: (0, levelSystem_1.getWorkshopCapacity)(userLevel, clearedMilestones),
        clearedCount: clearedMilestones.length,
    };
});
/**
 * Generate a milestone boss based on level threshold
 */
function generateMilestoneBoss(milestoneLevel, _seed) {
    // Boss difficulty scales with milestone level
    const difficultyMultiplier = 1 + (milestoneLevel / 10);
    const baseHp = Math.floor(80 * difficultyMultiplier);
    const baseAtk = Math.floor(15 * difficultyMultiplier);
    const baseDef = Math.floor(12 * difficultyMultiplier);
    const baseSpd = Math.floor(10 * difficultyMultiplier);
    const bossNames = [
        'GUARDIAN', 'WARDEN', 'SENTINEL', 'OVERSEER', 'COMMANDER'
    ];
    const nameIndex = Math.floor(milestoneLevel / 5) - 1;
    const name = `${bossNames[nameIndex] || 'ELITE'} Lv${milestoneLevel}`;
    return {
        bossId: `milestone_${milestoneLevel}`,
        name,
        milestoneLevel,
        stats: {
            hp: baseHp,
            attack: baseAtk,
            defense: baseDef,
            speed: baseSpd,
        },
        reward: {
            type: 'capacity',
            value: 1,
            description: 'CAPACITY +1',
        },
    };
}
/**
 * Execute a milestone boss battle
 * On victory: grants permanent capacity bonus
 */
exports.executeMilestoneBattle = functions
    .runWith({ memory: '512MB', timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
    const db = admin.firestore();
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const { milestoneLevel, robotId, variantId, useCheer } = data;
    if (!milestoneLevel || !levelSystem_1.MILESTONE_LEVELS.includes(milestoneLevel)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid milestone level');
    }
    if (!robotId && !variantId) {
        throw new functions.https.HttpsError('invalid-argument', 'robotId or variantId required');
    }
    const battleId = `milestone_${uid}_${milestoneLevel}`;
    const result = await db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(uid);
        const battleRef = db.collection('milestoneBattles').doc(battleId);
        const [userSnap, battleSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(battleRef)
        ]);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const userData = userSnap.data() || {};
        const userLevel = typeof userData.level === 'number' ? userData.level : 1;
        const clearedMilestones = Array.isArray(userData.clearedMilestones)
            ? userData.clearedMilestones
            : [];
        // Check if already cleared (idempotency)
        if (clearedMilestones.includes(String(milestoneLevel))) {
            if (battleSnap.exists) {
                const existingResult = battleSnap.data();
                return Object.assign({ alreadyCleared: true }, existingResult);
            }
            throw new functions.https.HttpsError('failed-precondition', 'already-cleared');
        }
        // Check level requirement
        if (userLevel < milestoneLevel) {
            throw new functions.https.HttpsError('failed-precondition', 'level-not-reached');
        }
        // Get player's robot
        let playerRobot;
        if (variantId) {
            playerRobot = await (0, variantSystem_1.resolveVariant)(uid, variantId, db, transaction);
        }
        else {
            const robotRef = userRef.collection('robots').doc(robotId);
            const robotSnap = await transaction.get(robotRef);
            if (!robotSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'Robot not found');
            }
            playerRobot = Object.assign({ id: robotSnap.id }, robotSnap.data());
        }
        // Generate boss
        const boss = generateMilestoneBoss(milestoneLevel, `milestone_${milestoneLevel}`);
        const bossRobot = {
            id: boss.bossId,
            name: boss.name,
            hp: boss.stats.hp,
            attack: boss.stats.attack,
            defense: boss.stats.defense,
            speed: boss.stats.speed,
            level: milestoneLevel,
            role: 'balanced',
            baseHp: boss.stats.hp,
            baseAttack: boss.stats.attack,
            baseDefense: boss.stats.defense,
            baseSpeed: boss.stats.speed,
        };
        // Run battle simulation - use base stats for RobotData compatibility
        const battleResult = (0, battleSystem_1.simulateBattle)({
            id: playerRobot.id,
            userId: '',
            name: playerRobot.name,
            sourceBarcode: playerRobot.sourceBarcode || '',
            rarity: playerRobot.rarity || 1,
            rarityName: playerRobot.rarityName || 'Common',
            baseHp: playerRobot.baseHp || 50,
            baseAttack: playerRobot.baseAttack || 10,
            baseDefense: playerRobot.baseDefense || 10,
            baseSpeed: playerRobot.baseSpeed || 10,
            elementType: playerRobot.elementType || 1,
            elementName: playerRobot.elementName || 'Fire',
            level: playerRobot.level || 1,
            skills: playerRobot.skills || [],
            parts: playerRobot.parts,
            colors: playerRobot.colors,
            evolutionLevel: playerRobot.evolutionLevel || 0,
            totalBattles: 0,
            totalWins: 0,
            isFavorite: false,
            role: playerRobot.role || 'balanced',
            cheer: useCheer || false,
        }, {
            id: bossRobot.id,
            userId: '',
            name: bossRobot.name,
            sourceBarcode: '',
            rarity: 1,
            rarityName: 'Boss',
            baseHp: bossRobot.baseHp,
            baseAttack: bossRobot.baseAttack,
            baseDefense: bossRobot.baseDefense,
            baseSpeed: bossRobot.baseSpeed,
            elementType: 1,
            elementName: 'Neutral',
            level: milestoneLevel,
            skills: [],
            parts: {},
            colors: {},
            evolutionLevel: 0,
            totalBattles: 0,
            totalWins: 0,
            isFavorite: false,
            role: 'balanced',
            cheer: false,
        }, `${battleId}_${Date.now()}`);
        const isWin = battleResult.winnerId === playerRobot.id;
        // Prepare update
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        let rewardGranted = false;
        if (isWin) {
            // Add to cleared milestones
            const newClearedMilestones = [...clearedMilestones, String(milestoneLevel)];
            updateData.clearedMilestones = newClearedMilestones;
            // Update workshopLines with new capacity
            updateData.workshopLines = (0, levelSystem_1.getWorkshopCapacity)(userLevel, newClearedMilestones);
            rewardGranted = true;
        }
        transaction.set(userRef, updateData, { merge: true });
        // Create battle record
        const battleRecord = {
            milestoneLevel,
            playerId: uid,
            playerRobotId: robotId || variantId,
            result: isWin ? 'win' : 'loss',
            winnerId: battleResult.winnerId,
            logs: battleResult.logs.slice(0, 20),
            rewardGranted,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        transaction.set(battleRef, battleRecord);
        return {
            battleId,
            result: isWin ? 'win' : 'loss',
            winnerId: battleResult.winnerId,
            logs: battleResult.logs.slice(0, 20),
            rewardGranted,
            reward: isWin ? { type: 'capacity', value: 1 } : null,
            turnCount: battleResult.turnCount,
        };
    });
    return result;
});
// ============================================
// Weekly Boss Functions
// ============================================
const WEEKLY_BOSS_CREDITS_REWARD = 50;
const WEEKLY_BOSS_XP_REWARD = 10;
/**
 * Generate a deterministic weekly boss based on week key
 */
function generateWeeklyBoss(weekKey) {
    const rng = new seededRandom_1.SeededRandom(`weekly_${weekKey}`);
    // Boss scales slightly each week for variety
    const weekNum = parseInt(weekKey.split('-')[1] || '1', 10);
    const difficultyMultiplier = 1 + (weekNum % 10) * 0.05;
    const baseHp = Math.floor(8000 * difficultyMultiplier);
    const baseAtk = Math.floor(300 * difficultyMultiplier);
    const baseDef = Math.floor(150 * difficultyMultiplier);
    const baseSpd = Math.floor(100 * difficultyMultiplier);
    const bossNames = [
        'COLOSSUS', 'TITAN', 'LEVIATHAN', 'BEHEMOTH',
        'GOLIATH', 'JUGGERNAUT', 'MONOLITH', 'DREADNOUGHT'
    ];
    const nameIdx = rng.nextInt(0, bossNames.length - 1);
    const name = `${bossNames[nameIdx]} W${weekNum}`;
    return {
        bossId: `weekly_${weekKey}`,
        name,
        weekKey,
        stats: {
            hp: baseHp,
            attack: baseAtk,
            defense: baseDef,
            speed: baseSpd,
        },
        reward: {
            credits: WEEKLY_BOSS_CREDITS_REWARD,
            xp: WEEKLY_BOSS_XP_REWARD,
        },
    };
}
/**
 * Get weekly boss status for the user
 */
exports.getWeeklyBoss = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (_data, context) => {
    const db = admin.firestore();
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const weekKey = (0, dateKey_1.getJstWeekKey)();
    // Generate this week's boss
    const boss = generateWeeklyBoss(weekKey);
    // Check if user has already claimed reward this week
    const weeklyRef = db.collection('users').doc(uid).collection('weeklyBoss').doc(weekKey);
    const weeklySnap = await weeklyRef.get();
    const weeklyData = weeklySnap.exists ? weeklySnap.data() : null;
    const rewardClaimed = !!(weeklyData === null || weeklyData === void 0 ? void 0 : weeklyData.claimed);
    const lastResult = (weeklyData === null || weeklyData === void 0 ? void 0 : weeklyData.result) || null;
    return {
        boss,
        weekKey,
        rewardClaimed,
        lastResult,
        canChallenge: true, // Can always challenge, but reward only once
    };
});
/**
 * Execute a weekly boss battle
 * Rewards are granted only once per week
 */
exports.executeWeeklyBattle = functions
    .runWith({ memory: '512MB', timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
    const db = admin.firestore();
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = context.auth.uid;
    const { robotId, variantId, useCheer } = data;
    if (!robotId && !variantId) {
        throw new functions.https.HttpsError('invalid-argument', 'robotId or variantId required');
    }
    const weekKey = (0, dateKey_1.getJstWeekKey)();
    const boss = generateWeeklyBoss(weekKey);
    const battleId = `weekly_${uid}_${weekKey}_${Date.now()}`;
    const result = await db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(uid);
        const weeklyRef = userRef.collection('weeklyBoss').doc(weekKey);
        const [userSnap, weeklySnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(weeklyRef)
        ]);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const weeklyData = weeklySnap.exists ? weeklySnap.data() : null;
        const alreadyClaimed = !!(weeklyData === null || weeklyData === void 0 ? void 0 : weeklyData.claimed);
        // Get player's robot
        let playerRobot;
        if (variantId) {
            playerRobot = await (0, variantSystem_1.resolveVariant)(uid, variantId, db, transaction);
        }
        else {
            const robotRef = userRef.collection('robots').doc(robotId);
            const robotSnap = await transaction.get(robotRef);
            if (!robotSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'Robot not found');
            }
            playerRobot = Object.assign({ id: robotSnap.id }, robotSnap.data());
        }
        // Run battle simulation
        const battleResult = (0, battleSystem_1.simulateBattle)({
            id: playerRobot.id,
            userId: '',
            name: playerRobot.name,
            sourceBarcode: playerRobot.sourceBarcode || '',
            rarity: playerRobot.rarity || 1,
            rarityName: playerRobot.rarityName || 'Common',
            baseHp: playerRobot.baseHp || 50,
            baseAttack: playerRobot.baseAttack || 10,
            baseDefense: playerRobot.baseDefense || 10,
            baseSpeed: playerRobot.baseSpeed || 10,
            elementType: playerRobot.elementType || 1,
            elementName: playerRobot.elementName || 'Fire',
            level: playerRobot.level || 1,
            skills: playerRobot.skills || [],
            parts: playerRobot.parts,
            colors: playerRobot.colors,
            evolutionLevel: playerRobot.evolutionLevel || 0,
            totalBattles: 0,
            totalWins: 0,
            isFavorite: false,
            role: playerRobot.role || 'balanced',
            cheer: useCheer || false,
        }, {
            id: boss.bossId,
            userId: '',
            name: boss.name,
            sourceBarcode: '',
            rarity: 1,
            rarityName: 'Weekly Boss',
            baseHp: boss.stats.hp,
            baseAttack: boss.stats.attack,
            baseDefense: boss.stats.defense,
            baseSpeed: boss.stats.speed,
            elementType: 1,
            elementName: 'Neutral',
            level: 10,
            skills: [],
            parts: {},
            colors: {},
            evolutionLevel: 0,
            totalBattles: 0,
            totalWins: 0,
            isFavorite: false,
            role: 'balanced',
            cheer: false,
        }, battleId);
        const isWin = battleResult.winnerId === playerRobot.id;
        let creditsReward = 0;
        let xpReward = 0;
        let rewardGranted = false;
        // Grant reward only if won AND hasn't claimed yet
        if (isWin && !alreadyClaimed) {
            creditsReward = WEEKLY_BOSS_CREDITS_REWARD;
            xpReward = WEEKLY_BOSS_XP_REWARD;
            rewardGranted = true;
            transaction.set(userRef, {
                credits: admin.firestore.FieldValue.increment(creditsReward),
                xp: admin.firestore.FieldValue.increment(xpReward),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        // Record weekly boss attempt
        transaction.set(weeklyRef, {
            result: isWin ? 'win' : 'loss',
            claimed: alreadyClaimed || (isWin && rewardGranted),
            claimedAt: rewardGranted ? admin.firestore.FieldValue.serverTimestamp() : ((weeklyData === null || weeklyData === void 0 ? void 0 : weeklyData.claimedAt) || null),
            lastBattleAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
        return {
            battleId,
            result: isWin ? 'win' : 'loss',
            winnerId: battleResult.winnerId,
            logs: battleResult.logs.slice(0, 20),
            rewardGranted,
            rewards: rewardGranted ? { credits: creditsReward, xp: xpReward } : null,
            alreadyClaimed,
            turnCount: battleResult.turnCount,
        };
    });
    return result;
});
//# sourceMappingURL=index.js.map