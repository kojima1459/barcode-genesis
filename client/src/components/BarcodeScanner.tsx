import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, AlertCircle, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCameraOption, setShowCameraOption] = useState(false);
  const [showFallbackInput, setShowFallbackInput] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = "html5qr-code-full-region";

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
      }
    };
  }, [isScanning]);

  const startScanning = async () => {
    setErrorMsg(null);
    setShowFallbackInput(false);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerRegionId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13]
        });
      }

      await scannerRef.current.start(
        { facingMode: "environment" }, // リアカメラ優先
        {
          fps: 10,
          qrbox: { width: 300, height: 200 }, // サイズを拡大
          // aspectRatio: 1.0, // アスペクト比制限を解除して視野を広く
          videoConstraints: {
            focusMode: "continuous", // フォーカスモード指定（対応ブラウザのみ）
            height: { min: 720 }, // 解像度担保
          }
        } as any,
        (decodedText) => {
          // 成功時
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // 読み取り失敗（フレームごと）は無視
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Camera start failed:", err);
      setIsScanning(false);

      // エラーハンドリング
      let message = "カメラを起動できませんでした。";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.message.includes("Permission denied")) {
          message = "カメラのアクセスが許可されていません。iOS Safariの場合は、URLバーの「aA」→「Webサイトの設定」→「カメラ」から許可してください。";
        } else if (err.name === "NotFoundError" || err.message.includes("No device")) {
          message = "カメラが見つかりませんでした。";
        }
      }
      setErrorMsg(message);
      setShowFallbackInput(true); // フォールバックを表示
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    await stopScanning();
    onScanSuccess(decodedText);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const imageFile = e.target.files[0];
      setShowFallbackInput(false); // UIリセット
      setErrorMsg("画像を解析中...");

      // Html5Qrcodeのファイルスキャン機能を使用
      const html5QrCode = new Html5Qrcode("html5qr-code-temp");
      html5QrCode.scanFile(imageFile, true)
        .then(decodedText => {
          setErrorMsg(null);
          onScanSuccess(decodedText);
        })
        .catch(err => {
          console.warn("Scan failed, retrying without strict constraints...");
          // 失敗した場合、制限を緩めて再試行（または単にエラー表示）
          // 画像が鮮明でない場合が多い
          setErrorMsg("バーコードを読み取れませんでした。\n・バーコード全体が写っているか確認してください\n・明るい場所で撮影してください\n・ピントが合っているか確認してください");
        });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">バーコード入力</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* エラー表示 */}
        {errorMsg && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs whitespace-pre-wrap">
              {errorMsg}
            </AlertDescription>
          </Alert>
        )}

        {/* メイン: 手動入力フォーム */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Keyboard className="w-4 h-4" />
            <span>バーコード番号を入力（13桁）</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="例: 4901234567890"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              pattern="[0-9]*"
              inputMode="numeric"
              className="font-mono text-lg"
              autoFocus
            />
            <Button type="submit" disabled={!manualCode} size="lg">
              生成
            </Button>
          </div>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              または
            </span>
          </div>
        </div>

        {/* スキャン領域 */}
        <div
          id={scannerRegionId}
          className={`w-full overflow-hidden rounded-lg border bg-black/5 relative ${!isScanning ? 'hidden' : ''}`}
        >
          {isScanning && (
            <div className="absolute top-4 left-0 right-0 z-10 text-center pointer-events-none">
              <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                バーコードを枠内に入れてください
              </span>
            </div>
          )}
        </div>

        {/* 一時的なスキャン用div (ファイルアップロード時などに使用) */}
        <div id="html5qr-code-temp" className="hidden"></div>

        {/* サブオプション: カメラスキャン */}
        {!showCameraOption ? (
          <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={() => setShowCameraOption(true)}>
            <Camera className="w-4 h-4 mr-2" />
            カメラでスキャンする
          </Button>
        ) : (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            {!isScanning ? (
              <div className="flex flex-col gap-2">
                <Button onClick={startScanning} variant="outline" className="w-full gap-2">
                  <Camera className="w-5 h-5" />
                  カメラを起動
                </Button>

                {/* 起動失敗時のフォールバック */}
                {showFallbackInput && (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="撮影して読み取る"
                    />
                    <Button variant="outline" size="lg" className="w-full py-6 gap-2 border-dashed">
                      <Camera className="w-5 h-5" />
                      撮影して読み取る
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="w-full">
                スキャン終了
              </Button>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
