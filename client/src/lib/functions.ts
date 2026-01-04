import { getAuth } from "./firebaseAuth";

// 型定義
interface GenerateRobotRequest {
    barcode: string;
}

interface GenerateRobotResponse {
    robotId: string;
    robot: any;
}

export async function callGenerateRobot(barcode: string) {
    const idToken = await getAuth().currentUser?.getIdToken();

    try {
        const response = await fetch('/api/generateRobot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': idToken ? `Bearer ${idToken}` : '',
            },
            body: JSON.stringify({ data: { barcode } }),
        });

        // Always log response for debugging
        const responseText = await response.text();
        let responseData: any = {};
        try {
            responseData = JSON.parse(responseText);
        } catch {
            // Response was not JSON
        }

        console.log('[generateRobot] Response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            contentType: response.headers.get('content-type'),
            bodyPreview: responseText.slice(0, 500),
        });

        if (!response.ok) {
            // Firebase HTTPS callable error standard: { error: { message, status, details, ... } }
            const errorInfo = responseData.error || {};
            const error = new Error(errorInfo.message || `HTTP ${response.status}: ${response.statusText}`);
            (error as any).code = errorInfo.status?.toLowerCase() || 'unknown';
            (error as any).httpStatus = response.status;
            (error as any).details = errorInfo.details;
            (error as any).rawBody = responseText;

            console.error('[generateRobot] API Error:', {
                httpStatus: response.status,
                code: (error as any).code,
                message: error.message,
                details: errorInfo.details,
                rawBody: responseText.slice(0, 1000),
            });

            throw error;
        }

        return responseData.result as GenerateRobotResponse;
    } catch (error: any) {
        // Detailed error logging
        console.error('[generateRobot] Error:', {
            name: error?.name,
            message: error?.message,
            code: error?.code,
            httpStatus: error?.httpStatus,
            details: error?.details,
            stack: error?.stack,
        });
        throw error;
    }
}
