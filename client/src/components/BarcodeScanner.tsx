import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, AlertCircle, Keyboard, CheckCircle2, Sun, Ruler, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import ScannerOverlay from "./ScannerOverlay";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

type ScanStatus = 'idle' | 'searching' | 'detected' | 'success';

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCameraOption, setShowCameraOption] = useState(false);
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanMessage, setScanMessage] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Vision API state
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = "html5qr-code-full-region";
  const failureCountRef = useRef(0);

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
    setScanStatus('searching');
    setScanMessage('バーコードを探しています...');
    failureCountRef.current = 0;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerRegionId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13]
        });
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 300, height: 200 },
          videoConstraints: {
            focusMode: "continuous",
            height: { min: 720 },
          }
        } as any,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          failureCountRef.current++;

          if (failureCountRef.current > 30 && failureCountRef.current % 10 === 0) {
            setScanMessage('バーコードが見つかりません。明るい場所で、カメラを10-15cm離してお試しください。');
          } else if (failureCountRef.current > 10) {
            setScanMessage('スキャン中... カメラを安定させてください');
          }
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Camera start failed:", err);
      setIsScanning(false);
      setScanStatus('idle');

      let message = "カメラを起動できませんでした。";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.message.includes("Permission denied")) {
          message = "カメラのアクセスが許可されていません。iOS Safariの場合は、URLバーの「aA」→「Webサイトの設定」→「カメラ」から許可してください。";
        } else if (err.name === "NotFoundError" || err.message.includes("No device")) {
          message = "カメラが見つかりませんでした。";
        }
      }
      setErrorMsg(message);
      setShowFallbackInput(true);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
        setScanStatus('idle');
        setScanMessage('');
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    setScanStatus('success');
    setScanMessage('読み取り成功！');
    setShowSuccess(true);

    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    await stopScanning();

    setTimeout(() => {
      setShowSuccess(false);
      onScanSuccess(decodedText);
    }, 500);
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
      setShowFallbackInput(false);
      setErrorMsg("画像を解析中...");

      const html5QrCode = new Html5Qrcode("html5qr-code-temp");
      html5QrCode.scanFile(imageFile, true)
        .then(decodedText => {
          setErrorMsg(null);
          onScanSuccess(decodedText);
        })
        .catch(err => {
          console.warn("Scan failed, retrying without strict constraints...");
          setErrorMsg("バーコードを読み取れませんでした。\n・バーコード全体が写っているか確認してください\n・明るい場所で撮影してください\n・ピントが合っているか確認してください");
        });
    }
  };

  // High-precision scan using Google Cloud Vision API
  const handleVisionScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const imageFile = e.target.files[0];
    setIsVisionScanning(true);
    setErrorMsg(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Call Cloud Vision API via Cloud Function
      const scanBarcodeWithVision = httpsCallable(functions, 'scanBarcodeWithVision');
      const result = await scanBarcodeWithVision({ imageBase64: base64 });
      const data = result.data as { barcode: string | null; success: boolean };

      if (data.success && data.barcode) {
        toast.success(`バーコードを検出しました: ${data.barcode}`);
        onScanSuccess(data.barcode);
      } else {
        setErrorMsg("高精度スキャンでもバーコードを検出できませんでした。\n画像がはっきり写っているか確認してください。");
      }
    } catch (error: any) {
      console.error("Vision API scan failed:", error);

      const code = error?.code;
      let userMsg = "高精度スキャンに失敗しました。\n";

      if (code === 'unauthenticated') {
        userMsg += "ログインが必要です。再度ログインしてください。";
      } else if (code === 'not-found') {
        userMsg += "機能が見つかりません(404)。管理者に連絡してください。";
      } else if (code === 'internal') {
        userMsg += "サーバー側でエラーが発生しました。";
      } else {
        userMsg += "ネットワーク接続を確認してください。";
      }

      setErrorMsg(userMsg);
    } finally {
      setIsVisionScanning(false);
      // Reset file input
      e.target.value = '';
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
          style={{ minHeight: isScanning ? '300px' : undefined }}
        >
          {/* AR Scanner Overlay */}
          <ScannerOverlay isScanning={isScanning} status={scanStatus} />

          {/* Smart Scan Guide Overlay */}
          {isScanning && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              {/* Top message */}
              <div className="absolute top-2 left-0 right-0 text-center">
                <span className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5">
                  {scanStatus === 'success' ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-400" /> {scanMessage}</>
                  ) : (
                    <>{scanMessage}</>
                  )}
                </span>
              </div>

              {/* Bottom hints */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3 text-xs">
                <span className="bg-black/60 text-white/80 px-2 py-1 rounded flex items-center gap-1">
                  <Ruler className="w-3 h-3" /> 10-15cm
                </span>
                <span className="bg-black/60 text-white/80 px-2 py-1 rounded flex items-center gap-1">
                  <Sun className="w-3 h-3" /> 明るく
                </span>
              </div>
            </div>
          )}

          {/* Success Flash */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-green-500/30 z-20 flex items-center justify-center"
              >
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 一時的なスキャン用div */}
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

        {/* 高精度スキャン (Vision API) */}
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleVisionScan}
            disabled={isVisionScanning}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="高精度スキャン"
          />
          <Button
            variant="secondary"
            className="w-full gap-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 hover:border-purple-500/50"
            disabled={isVisionScanning}
          >
            {isVisionScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI解析中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-purple-400" />
                高精度スキャン（AI解析）
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-1">
            読み取りにくいバーコードにおすすめ
          </p>
        </div>

      </CardContent>
    </Card>
  );
}


