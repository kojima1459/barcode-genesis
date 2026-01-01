/**
 * Barcode Normalization Utility for Functions
 * サーバー側正規化: 二重安全策として、seed生成前にバーコードを正規化
 * 
 * REF: EAN8 - EAN-8/UPC-A対応
 */

/**
 * EAN-13 チェックデジット計算
 */
function ean13CheckDigit(payload12: string): string {
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
 */
function ean8CheckDigit(payload7: string): string {
    if (payload7.length !== 7) {
        throw new Error('payload7 must be 7 digits');
    }
    let sum = 0;
    for (let i = 0; i < 7; i++) {
        const digit = parseInt(payload7[i], 10);
        sum += i % 2 === 0 ? digit * 3 : digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return String(checkDigit);
}

function isValidEan13(code13: string): boolean {
    if (!/^\d{13}$/.test(code13)) return false;
    const payload = code13.slice(0, 12);
    const check = code13[12];
    return ean13CheckDigit(payload) === check;
}

function isValidEan8(code8: string): boolean {
    if (!/^\d{8}$/.test(code8)) return false;
    const payload = code8.slice(0, 7);
    const check = code8[7];
    return ean8CheckDigit(payload) === check;
}

function isValidUpcA(code12: string): boolean {
    if (!/^\d{12}$/.test(code12)) return false;
    const ean13 = '0' + code12;
    return isValidEan13(ean13);
}

/**
 * 生のバーコード入力を EAN-13 に正規化
 * 
 * @param raw - 生のバーコード文字列
 * @returns 13桁のEAN-13文字列、または正規化できない場合はnull
 */
export function normalizeBarcodeForSeed(raw: string): string | null {
    // 数字以外を除去
    const cleaned = raw.replace(/\D/g, '');

    // 13桁: EAN-13
    if (cleaned.length === 13) {
        if (isValidEan13(cleaned)) {
            return cleaned;
        }
        return null;
    }

    // 12桁: UPC-A → 先頭に0を追加
    if (cleaned.length === 12) {
        if (isValidUpcA(cleaned)) {
            return '0' + cleaned;
        }
        return null;
    }

    // 8桁: EAN-8 → "00000" + 先頭7桁 + 新チェックデジット
    if (cleaned.length === 8) {
        if (isValidEan8(cleaned)) {
            const payload12 = '00000' + cleaned.slice(0, 7);
            const check = ean13CheckDigit(payload12);
            return payload12 + check;
        }
        return null;
    }

    // その他は非対応
    return null;
}
