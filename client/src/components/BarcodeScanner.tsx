import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useRef, useState } from "react";
import { AlertCircle, Keyboard, Image, Loader2, Sparkles, Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import Quagga from "@ericblade/quagga2";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  
  // 2つのinput要素のためのref
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [...prev, msg].slice(-10));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  // The "Ultimate" Hybrid Image-based barcode detection
  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const imageFile = e.target.files[0];
    setIsScanning(true);
    setErrorMsg(null);
    setDebugLog([]);

    try {
      // PHASE 1: Try Gemini API (AI OCR)
      try {
        const resizedBase64 = await resizeAndCompressForCloud(imageFile);
        addLog(`Sending to AI Engine (Gemini 2.0) (size: ${Math.round(resizedBase64.length / 1024)}KB)`);

        const scanBarcodeFromImage = httpsCallable(functions, 'scanBarcodeFromImage');
        const result = await scanBarcodeFromImage({ imageBase64: resizedBase64 });
        const data = result.data as any;

        console.log("AI Response:", data);

        // 新しいJSON形式のレスポンスに対応
        if (data && data.success && data.barcode) {
          const code = data.barcode;
          setManualCode(code);
          toast.success(`AIスキャン成功: ${code} (${data.type || 'Unknown'})`);
          setIsScanning(false);
          resetInputs();
          onScanSuccess(code);
          return;
        } else {
          addLog(`AI Analysis: ${data.message || 'Barcode not detected'}`);
        }
      } catch (geminiErr: any) {
        console.warn("Gemini API failed:", geminiErr);
        addLog(`AI Engine Error: ${geminiErr.message}`);
      }

      // PHASE 2: Native BarcodeDetector API (OS Level)
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const detector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
          });
          const bitmap = await createImageBitmap(imageFile);
          const barcodes = await detector.detect(bitmap);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            setManualCode(code);
            toast.success(`ネイティブ検知: ${code}`);
            resetInputs();
            onScanSuccess(code);
            return;
          }
        } catch (nativeErr) {
          console.warn("Native BarcodeDetector failed, falling back to ZXing...", nativeErr);
        }
      }

      // PHASE 3: ZXing Multi-pass (Software Engine)
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      const resultText = await multiAttemptScaleAndScan(imageFile, reader);

      if (resultText) {
        setManualCode(resultText);
        toast.success(`精密ローカル検知: ${resultText}`);
        resetInputs();
        onScanSuccess(resultText);
        return;
      }

      // PHASE 4: Quagga2 Fallback (Alternative Software Engine)
      try {
        const rawUrl = URL.createObjectURL(imageFile);
        // Quagga sometimes works better with the raw URL than canvas data
        const quaggaResult = await scanWithQuagga(rawUrl);
        URL.revokeObjectURL(rawUrl);

        if (quaggaResult) {
          setManualCode(quaggaResult);
          toast.success(`補助エンジンで検出: ${quaggaResult}`);
          resetInputs();
          onScanSuccess(quaggaResult);
          return;
        }
      } catch (qErr) {
        console.warn("Quagga2 failed:", qErr);
        addLog(`Quagga Error: ${qErr}`);
      }

      // All engines failed - show helpful error message
      throw new Error("Could not detect barcode with any engine.");
    } catch (error: any) {
      console.error("Barcode scan chain failed:", error);
      setErrorMsg("すべてのエンジンでの解析に失敗しました。\n\n【コツ】\n・バーコードを真っ直ぐ、大きく撮影してください\n・光の反射（白飛び）を防いでください\n・どうしても読み取れない場合は下の番号を入力してください");
      if (onScanFailure) onScanFailure(error);
    } finally {
      setIsScanning(false);
      resetInputs();
    }
  };

  const resetInputs = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Consolidated high-quality image resizing for Cloud Vision
  async function resizeAndCompressForCloud(file: File): Promise<string> {
    // Basic file size check before processing
    if (file.size > 10 * 1024 * 1024) { // 10MB absolute limit for initial processing
      throw new Error("ファイルサイズが大きすぎます。10MB以下の画像を使用してください。");
    }

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        let width = img.width;
        let height = img.height;
        const maxDim = 1280; // Standardized for best quality/size balance

        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG 0.7 as requested by user for balance
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        const kbSize = Math.round(base64.length / 1024);

        if (kbSize > 2500) { // 2.5MB limit
          reject(new Error(`画像が大きすぎます (${Math.round(kbSize / 1024)}MB)。解像度を下げるか、もう少し離れて撮影してください。`));
          return;
        }

        if (kbSize > 1500) {
          toast.info("大きな画像を送信しています。通信に時間がかかる場合があります。");
        }

        resolve(base64);
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  // Try multiple scales and filters to find the barcode (Phase 3 fallback)
  async function multiAttemptScaleAndScan(file: File, reader: BrowserMultiFormatReader): Promise<string | null> {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      img.src = url;
    });
    URL.revokeObjectURL(url);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !img.width) return null;

    // Try 8 variations of scale and processing
    const attempts = [
      { maxDim: 1200, filter: 'contrast(1.5) grayscale(1)' },
      { maxDim: 800, filter: 'contrast(1.2) grayscale(1)' },
      { maxDim: 1600, filter: 'brightness(1.1) contrast(1.3) grayscale(1)' },
      { maxDim: 1000, filter: 'none' },
      { maxDim: 1000, rotate: true, filter: 'contrast(1.4) grayscale(1)' },
      { maxDim: 800, rotate: true, filter: 'none' },
      { maxDim: 1200, filter: 'invert(1) contrast(1.5) grayscale(1)' }, // Inversion fallback
      { maxDim: 1000, rotate: true, filter: 'invert(1) contrast(1.4) grayscale(1)' }, // Inverted rotation
      { maxDim: 999, filter: 'contrast(1.6) grayscale(1)' } // Center Crop High Contrast (Special)
    ];

    for (const attempt of attempts) {
      // Logic for Center Crop (sometimes barcode is in the center and edges are noisy)
      const useCenterCrop = attempt.maxDim === 999;

      let width = img.width;
      let height = img.height;
      const targetDim = useCenterCrop ? 1200 : attempt.maxDim;
      const ratio = Math.min(targetDim / width, targetDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      canvas.width = width;
      canvas.height = height;

      if (attempt.rotate) {
        canvas.width = height;
        canvas.height = width;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.filter = attempt.filter;
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
      } else if (useCenterCrop) {
        // Center Crop Logic: Draw only the center 60%
        const sx = img.width * 0.2;
        const sy = img.height * 0.2;
        const sWidth = img.width * 0.6;
        const sHeight = img.height * 0.6;
        ctx.filter = attempt.filter;
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height);
      } else {
        ctx.filter = attempt.filter;
        ctx.drawImage(img, 0, 0, width, height);
      }

      try {
        const result = await reader.decodeFromCanvas(canvas);
        if (result) return result.getText();
      } catch (e) {
        // Continue to next attempt
      }
    }
    return null;
  }

  // Quagga2 Wrapper for Phase 4
  async function scanWithQuagga(imageUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
      Quagga.decodeSingle({
        src: imageUrl,
        numOfWorkers: 0, // Main thread only for simplicity
        inputStream: {
          size: 800 // Standard size
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader"] // Focus on JAN/EAN
        },
      }, (result) => {
        if (result && result.codeResult && result.codeResult.code) {
          resolve(result.codeResult.code);
        } else {
          resolve(null);
        }
      });
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Image className="w-6 h-6 text-primary" />
            画像からスキャン (推奨)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-secondary/20 p-4 rounded-lg border border-dashed border-primary/30 text-center">
            {/* カメラ用Input (captureあり) */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageScan}
              className="hidden"
              id="camera-input"
              ref={cameraInputRef}
              disabled={isScanning}
            />
            
            {/* アルバム用Input (captureなし) */}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageScan}
              className="hidden"
              id="file-input"
              ref={fileInputRef}
              disabled={isScanning}
            />

            {isScanning ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <span className="font-bold text-lg animate-pulse">AI解析中...</span>
                <span className="text-xs text-muted-foreground">Gemini AIが画像を読み取っています</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* カメラボタン */}
                  <label
                    htmlFor="camera-input"
                    className="flex flex-col items-center justify-center gap-2 cursor-pointer py-6 bg-background rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-primary" />
                    <span className="font-bold text-sm">カメラで撮影</span>
                  </label>

                  {/* アルバムボタン */}
                  <label
                    htmlFor="file-input"
                    className="flex flex-col items-center justify-center gap-2 cursor-pointer py-6 bg-background rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-primary" />
                    <span className="font-bold text-sm">アルバムから</span>
                  </label>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3 inline mr-1 text-yellow-500" />
                  AIがバーコードの数字を自動で読み取ります
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap text-xs">
                {errorMsg}
              </AlertDescription>
            </Alert>
          )}

          {debugLog.length > 0 && (
            <div className="text-[10px] text-muted-foreground bg-black/5 p-2 rounded max-h-20 overflow-y-auto font-mono">
              {debugLog.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">または</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Keyboard className="w-4 h-4" />
            バーコード番号を直接入力
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="tel"
              placeholder="例: 4901234567890"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="font-mono text-lg tracking-widest"
              maxLength={13}
            />
            <Button type="submit" disabled={manualCode.length < 8}>
              決定
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
