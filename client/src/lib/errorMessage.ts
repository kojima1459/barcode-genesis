/**
 * エラーメッセージ日本語化ユーティリティ
 * 
 * サーバー/クライアントのエラーを子供向けの日本語メッセージに変換し、
 * 技術的なコードはUIに表示せずにログに残す。
 */

export interface UserMessage {
    /** オプションのタイトル */
    title?: string;
    /** ユーザー向けメッセージ */
    message: string;
    /** エラーかどうか (false = 情報/警告、already-exists用) */
    isError?: boolean;
    /** アクションボタン */
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}

interface ErrorLike {
    code?: string;
    message?: string;
    httpStatus?: number;
    status?: number;
    response?: {
        status?: number;
    };
}

/**
 * エラーコードを正規化
 * - "functions/already-exists" -> "already-exists"
 * - "ALREADY_EXISTS" -> "already-exists"
 */
function normalizeErrorCode(code: string | undefined): string {
    if (!code) return '';
    // Remove "functions/" prefix if present
    let normalized = code.replace(/^functions\//, '');
    // Convert to lowercase and replace underscores
    normalized = normalized.toLowerCase().replace(/_/g, '-');
    return normalized;
}

/**
 * HTTPステータスからエラーコードを推測
 */
function codeFromStatus(status: number | undefined): string | null {
    if (!status) return null;
    switch (status) {
        case 409: return 'already-exists';
        case 400: return 'invalid-argument';
        case 401: return 'unauthenticated';
        case 403: return 'permission-denied';
        case 404: return 'not-found';
        case 429: return 'resource-exhausted';
        case 500: return 'internal';
        case 503: return 'unavailable';
        default: return null;
    }
}

/**
 * エラーオブジェクトから情報を抽出
 */
function extractErrorInfo(err: unknown): {
    code: string;
    message: string;
    httpStatus: number | undefined;
} {
    if (!err) {
        return { code: '', message: '', httpStatus: undefined };
    }

    const e = err as ErrorLike;

    // Extract HTTP status from various sources
    const httpStatus = e.httpStatus ?? e.status ?? e.response?.status;

    // Extract message
    const message = typeof e.message === 'string' ? e.message : String(err);

    // Extract and normalize code
    let code = normalizeErrorCode(e.code);

    // Fallback: try to infer code from HTTP status
    if (!code && httpStatus) {
        code = codeFromStatus(httpStatus) || '';
    }

    // Fallback: check message for known patterns
    if (!code) {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('already-exists') || lowerMsg.includes('already_exists')) {
            code = 'already-exists';
        } else if (lowerMsg.includes('invalid-argument') || lowerMsg.includes('invalid_argument')) {
            code = 'invalid-argument';
        } else if (lowerMsg.includes('unauthenticated')) {
            code = 'unauthenticated';
        } else if (lowerMsg.includes('resource-exhausted') || lowerMsg.includes('resource_exhausted')) {
            code = 'resource-exhausted';
        }
    }

    return { code, message, httpStatus };
}

/**
 * エラーをユーザー向けメッセージに変換
 * 
 * @param err - エラーオブジェクト
 * @param options - オプション（バーコードなど）
 * @returns ユーザー向けメッセージ
 */
export function toUserMessage(
    err: unknown,
    options?: { barcode?: string }
): UserMessage {
    const { code, message, httpStatus } = extractErrorInfo(err);

    // 開発者向けログ（常に出力）
    console.error('[toUserMessage] Error details:', {
        code,
        httpStatus,
        rawMessage: message,
        barcode: options?.barcode,
    });

    // エラーコード別のメッセージマッピング
    switch (code) {
        case 'already-exists':
            return {
                message: 'このバーコードのロボは、もう持ってるよ。',
                isError: false, // 失敗ではなく情報として扱う
                action: {
                    label: '図鑑を見る',
                    href: '/dex',
                },
            };

        case 'resource-exhausted':
            return {
                title: '今日の生成上限に達したよ',
                message: message || 'また明日チャレンジしてね！',
                isError: true,
                action: {
                    label: 'プレミアムを見る',
                    href: '/premium',
                },
            };

        case 'invalid-argument':
            return {
                message: 'このバーコードは使えないよ。別のバーコードを試してね。',
                isError: true,
            };

        case 'unauthenticated':
            return {
                message: 'ログインしてからもう一度ためしてね。',
                isError: true,
                action: {
                    label: 'ログイン',
                    href: '/login',
                },
            };

        case 'internal':
        case 'unavailable':
            return {
                message: 'サーバーがいそがしいみたい。少し待ってからもう一度ためしてね。',
                isError: true,
            };

        case 'permission-denied':
            return {
                message: 'この操作はできないよ。',
                isError: true,
            };

        case 'not-found':
            return {
                message: '見つからなかったよ。',
                isError: true,
            };

        default:
            // フォールバック: 一般エラー
            return {
                message: 'うまくいかなかったよ。もう一度ためしてね。',
                isError: true,
            };
    }
}

/**
 * エラーが「重複」かどうかを判定
 */
export function isAlreadyExistsError(err: unknown): boolean {
    const { code } = extractErrorInfo(err);
    return code === 'already-exists';
}

/**
 * エラーが「レート制限」かどうかを判定
 */
export function isRateLimitError(err: unknown): boolean {
    const { code } = extractErrorInfo(err);
    return code === 'resource-exhausted';
}
