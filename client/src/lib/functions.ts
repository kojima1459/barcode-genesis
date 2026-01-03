import { getAuth } from "./firebase";

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

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Firebase HTTPS callable error standard: { error: { message, status, ... } }
            const error = new Error(errorData.error?.message || `HTTP ${response.status}`);
            (error as any).code = errorData.error?.status?.toLowerCase() || 'unknown';
            throw error;
        }

        const result = await response.json();
        return result.result as GenerateRobotResponse;
    } catch (error: any) {
        console.error("callGenerateRobot error:", error);
        throw error;
    }
}
