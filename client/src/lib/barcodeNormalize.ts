/**
 * Barcode Normalization Utility
 * 正規化ユーティリティ: EAN-8/UPC-A/EAN-13 を全て EAN-13 に統一
 *
 * REF: EAN8 - EAN-8/UPC-A対応
 */

export type BarcodeKind = 'EAN13' | 'EAN8' | 'UPCA';

export type NormalizeResult =
    | { ok: true; ean13: string; kind: BarcodeKind }
    | { ok: false; reason: string };

/**
 * EAN-13 チェックデジット計算
 * payload12: 12桁の数字文字列
 * returns: 1桁のチェックデジット文字列
 */
export function ean13CheckDigit(payload12: string): string {
    if (payload12.length !== 12) {
        throw new Error('payload12 must be 12 digits');
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(payload12[i], 10);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return String(checkDigit);
}

/**
 * EAN-8 チェックデジット計算
 * payload7: 7桁の数字文字列
 * returns: 1桁のチェックデジット文字列
 */
export function ean8CheckDigit(payload7: string): string {
    if (payload7.length !== 7) {
        throw new Error('payload7 must be 7 digits');
    }
    let sum = 0;
    for (let i = 0; i < 7; i++) {
        const digit = parseInt(payload7[i], 10);
        // EAN-8: 偶数位置(0,2,4,6)に重み3、奇数位置(1,3,5)に重み1
        sum += i % 2 === 0 ? digit * 3 : digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return String(checkDigit);
}

/**
 * EAN-13 バリデーション
 */
export function isValidEan13(code13: string): boolean {
    if (!/^\d{13}$/.test(code13)) return false;
    const payload = code13.slice(0, 12);
    const check = code13[12];
    return ean13CheckDigit(payload) === check;
}

/**
 * EAN-8 バリデーション
 */
export function isValidEan8(code8: string): boolean {
    if (!/^\d{8}$/.test(code8)) return false;
    const payload = code8.slice(0, 7);
    const check = code8[7];
    return ean8CheckDigit(payload) === check;
}

/**
 * UPC-A バリデーション (12桁)
 * UPC-A は EAN-13 の左端に 0 を追加した形式と等価
 */
export function isValidUpcA(code12: string): boolean {
    if (!/^\d{12}$/.test(code12)) return false;
    // 0 + 12桁 = 13桁 EAN-13 としてチェック
    const ean13 = '0' + code12;
    return isValidEan13(ean13);
}

/**
 * EAN-8 を決定的な EAN-13 に変換
 * 変換ルール: "00000" + ean8の先頭7桁 + 新チェックデジット
 * 
 * 同じ EAN-8 入力は必ず同じ EAN-13 を出力する（決定的）
 */
export function ean8ToEan13(ean8: string): string {
    if (!isValidEan8(ean8)) {
        throw new Error('Invalid EAN-8');
    }
    // "00000" + 先頭7桁 = 12桁
    const payload12 = '00000' + ean8.slice(0, 7);
    const check = ean13CheckDigit(payload12);
    return payload12 + check;
}

/**
 * UPC-A を EAN-13 に変換
 * 変換ルール: 先頭に "0" を追加
 */
export function upcAToEan13(upcA: string): string {
    if (!isValidUpcA(upcA)) {
        throw new Error('Invalid UPC-A');
    }
    return '0' + upcA;
}

/**
 * 生のバーコード入力を EAN-13 に正規化
 * 
 * @param raw - 生のバーコード文字列（スペース/ハイフン含む可能性あり）
 * @returns 正規化結果
 */
export function normalizeToEan13(raw: string): NormalizeResult {
    // 数字以外を除去
    const cleaned = raw.replace(/\D/g, '');

    // 空文字チェック
    if (cleaned.length === 0) {
        return { ok: false, reason: 'バーコードが空です' };
    }

    // 13桁: EAN-13
    if (cleaned.length === 13) {
        if (isValidEan13(cleaned)) {
            return { ok: true, ean13: cleaned, kind: 'EAN13' };
        }
        return { ok: false, reason: 'EAN-13 チェックデジットエラー' };
    }

    // 12桁: UPC-A
    if (cleaned.length === 12) {
        if (isValidUpcA(cleaned)) {
            const ean13 = upcAToEan13(cleaned);
            return { ok: true, ean13, kind: 'UPCA' };
        }
        return { ok: false, reason: 'UPC-A チェックデジットエラー' };
    }

    // 8桁: EAN-8
    if (cleaned.length === 8) {
        if (isValidEan8(cleaned)) {
            const ean13 = ean8ToEan13(cleaned);
            return { ok: true, ean13, kind: 'EAN8' };
        }
        return { ok: false, reason: 'EAN-8 チェックデジットエラー' };
    }

    // その他の桁数
    return { ok: false, reason: `対応していないバーコード形式 (${cleaned.length}桁)` };
}
