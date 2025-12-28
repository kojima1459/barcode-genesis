import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// 型定義（本来は共有型を使うべきだが、簡易的に定義）
interface GenerateRobotRequest {
    barcode: string;
}

interface GenerateRobotResponse {
    robotId: string;
    robot: any; // 具体的な型があればそれを使う
}

export async function callGenerateRobot(barcode: string) {
    const generateRobot = httpsCallable<GenerateRobotRequest, GenerateRobotResponse>(
        functions,
        "generateRobot"
    );
    try {
        const result = await generateRobot({ barcode });
        return result.data;
    } catch (error: any) {
        console.error("callGenerateRobot error:", error);
        throw error;
    }
}
