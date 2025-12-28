"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.followUser = exports.claimMissionReward = exports.getDailyMissions = exports.claimLoginBonus = exports.equipItem = exports.purchaseItem = exports.inheritSkill = exports.synthesizeRobots = exports.startBattle = exports.generateRobot = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto_1 = require("crypto");
const robotGenerator_1 = require("./robotGenerator");
const battleSystem_1 = require("./battleSystem");
const skills_1 = require("./skills");
admin.initializeApp();
const ITEM_CATALOG = {
    power_core: { price: 100 },
    shield_plate: { price: 80 },
    speed_chip: { price: 60 }
};
const isItemId = (itemId) => {
    return Object.prototype.hasOwnProperty.call(ITEM_CATALOG, itemId);
};
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const LOGIN_BONUS_CREDITS = 50;
const DAILY_MISSIONS = [
    { id: "scan_barcode", title: "Scan 1 barcode", target: 1, rewardCredits: 30 },
    { id: "win_battle", title: "Win 1 battle", target: 1, rewardCredits: 40 },
    { id: "synthesize", title: "Synthesize 1 robot", target: 1, rewardCredits: 50 }
];
const getJstDateKey = (date = new Date()) => {
    const jst = new Date(date.getTime() + JST_OFFSET_MS);
    return jst.toISOString().slice(0, 10);
};
const getYesterdayJstDateKey = () => {
    const jst = new Date(Date.now() + JST_OFFSET_MS);
    jst.setUTCDate(jst.getUTCDate() - 1);
    return jst.toISOString().slice(0, 10);
};
const buildDailyMissions = () => {
    return DAILY_MISSIONS.map((mission) => (Object.assign(Object.assign({}, mission), { progress: 0, claimed: false })));
};
const getUserCredits = (user) => {
    var _a;
    const credits = (_a = user === null || user === void 0 ? void 0 : user.credits) !== null && _a !== void 0 ? _a : 0;
    return typeof credits === "number" ? credits : 0;
};
// ロボット生成API
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
        // ロボットデータ生成
        const robotData = (0, robotGenerator_1.generateRobotFromBarcode)(barcode, userId);
        await db.runTransaction(async (t) => {
            const existing = await t.get(robotRef);
            (0, robotGenerator_1.assertRobotNotExists)(existing.exists);
            const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
            t.set(robotRef, Object.assign(Object.assign({}, robotData), { id: robotRef.id, createdAt: serverTimestamp, updatedAt: serverTimestamp }));
            t.set(userRef, {
                totalRobots: admin.firestore.FieldValue.increment(1),
                credits: admin.firestore.FieldValue.increment(0)
            }, { merge: true });
        });
        return {
            robotId: robotRef.id,
            robot: Object.assign(Object.assign({}, robotData), { id: robotRef.id })
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
// バトル開始API
const MATERIAL_MAX_COUNT = 5;
const MATERIAL_LEVEL_XP = 25;
const LEVEL_XP = 100;
const INHERIT_SUCCESS_RATE = 0.35;
const MAX_SKILLS = 4;
const getRobotXp = (robot) => {
    var _a, _b, _c;
    const xp = (_c = (_b = (_a = robot === null || robot === void 0 ? void 0 : robot.xp) !== null && _a !== void 0 ? _a : robot === null || robot === void 0 ? void 0 : robot.exp) !== null && _b !== void 0 ? _b : robot === null || robot === void 0 ? void 0 : robot.experience) !== null && _c !== void 0 ? _c : 0;
    return typeof xp === "number" ? xp : 0;
};
exports.startBattle = functions.https.onCall(async (data, context) => {
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
        const myRobot = Object.assign({ id: myRobotDoc.id }, myRobotDoc.data());
        const enemyRobot = Object.assign({ id: enemyRobotDoc.id }, enemyRobotDoc.data());
        // バトルシミュレーション実行
        const result = (0, battleSystem_1.simulateBattle)(myRobot, enemyRobot);
        // Update win/loss records and EXP
        // Note: This assumes enemy is also a user robot. For CPU, we skip update.
        // For friend battle, we need to find the owner of the enemy robot.
        // Since we don't pass enemyUserId, we'll search for it or assume it's in the robot data if we added it.
        // For now, we only update MY robot's stats to keep it simple and safe.
        const myRobotRef = admin.firestore().collection('users').doc(userId).collection('robots').doc(myRobotId);
        await admin.firestore().runTransaction(async (t) => {
            const doc = await t.get(myRobotRef);
            if (!doc.exists)
                return;
            const robot = doc.data();
            const isWinner = result.winnerId === myRobotId;
            if (isWinner) {
                const currentExp = getRobotXp(robot) + result.rewards.exp;
                const currentLevel = robot.level || 1;
                const expToNextLevel = currentLevel * 100;
                let updates = {
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
                        const newSkill = (0, skills_1.getRandomSkill)();
                        const currentSkills = (0, skills_1.normalizeSkillIds)(robot.skills);
                        const alreadyHasSkill = currentSkills.includes(newSkill.id);
                        if (alreadyHasSkill) {
                            result.rewards.upgradedSkill = newSkill.name;
                        }
                        else if (currentSkills.length < 4) {
                            currentSkills.push(newSkill.id);
                            result.rewards.newSkill = newSkill.name;
                            updates.skills = currentSkills;
                        }
                    }
                }
                t.update(myRobotRef, updates);
            }
            else {
                t.update(myRobotRef, {
                    losses: (robot.losses || 0) + 1,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });
        return { success: true, result };
    }
    catch (error) {
        console.error("Battle error:", error);
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
        materialRefs.forEach((ref) => t.delete(ref));
        return { baseRobotId: baseRef.id, newLevel, newXp };
    });
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
        if (credits < cost) {
            throw new functions.https.HttpsError('failed-precondition', 'insufficient-funds');
        }
        const inventorySnap = await t.get(inventoryRef);
        const currentQty = inventorySnap.exists && typeof ((_a = inventorySnap.data()) === null || _a === void 0 ? void 0 : _a.qty) === "number"
            ? (_b = inventorySnap.data()) === null || _b === void 0 ? void 0 : _b.qty
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
            t.set(returnRef, { itemId: currentItem, qty: newReturnQty }, { merge: true });
            t.update(robotRef, {
                [`equipped.${slotKey}`]: null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
        t.set(equipRef, { itemId, qty: newEquipQty }, { merge: true });
        inventoryUpdates[itemId] = newEquipQty;
        if (currentItem) {
            const returnRef = inventoryCollection.doc(currentItem);
            const returnSnap = await t.get(returnRef);
            const returnQty = returnSnap.exists && typeof ((_g = returnSnap.data()) === null || _g === void 0 ? void 0 : _g.qty) === "number"
                ? (_h = returnSnap.data()) === null || _h === void 0 ? void 0 : _h.qty
                : 0;
            const newReturnQty = returnQty + 1;
            t.set(returnRef, { itemId: currentItem, qty: newReturnQty }, { merge: true });
            inventoryUpdates[currentItem] = newReturnQty;
        }
        const nextEquipped = Object.assign(Object.assign({}, equipped), { [slotKey]: itemId });
        t.update(robotRef, {
            [`equipped.${slotKey}`]: itemId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { equipped: nextEquipped, inventory: inventoryUpdates };
    });
    return result;
});
// ログインボーナスAPI
exports.claimLoginBonus = functions.https.onCall(async (_data, context) => {
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
        const lastLoginDateKey = userData === null || userData === void 0 ? void 0 : userData.lastLoginDateKey;
        if (lastLoginDateKey === todayKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Already claimed today');
        }
        const currentStreak = typeof (userData === null || userData === void 0 ? void 0 : userData.loginStreak) === "number" ? userData.loginStreak : 0;
        const newStreak = lastLoginDateKey === yesterdayKey ? currentStreak + 1 : 1;
        const credits = getUserCredits(userData);
        const newCredits = credits + LOGIN_BONUS_CREDITS;
        t.set(userRef, {
            credits: newCredits,
            lastLoginDateKey: todayKey,
            loginStreak: newStreak,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { streak: newStreak, credits: newCredits };
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
exports.claimMissionReward = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const dateKey = data === null || data === void 0 ? void 0 : data.dateKey;
    const missionId = data === null || data === void 0 ? void 0 : data.missionId;
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
//# sourceMappingURL=index.js.map