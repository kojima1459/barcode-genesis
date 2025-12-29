import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useRef, useState } from "react";
import { AlertCircle, Keyboard, Image, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import { functions, auth } from "@/lib/firebase";
import Quagga from "@ericblade/quagga2";
import Tesseract from "tesseract.js";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
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
      // PHASE 1: Try Cloud Vision API (Industrial Grade)
      try {
        const resizedBase64 = await resizeAndCompressForCloud(imageFile);
        addLog(`Sending to Vision API (size: ${Math.round(resizedBase64.length / 1024)}KB)`);

        // Use the Hosting rewrite endpoint to bypass CORS and 401 issues
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/scanBarcodeWithVision', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : '',
          },
          body: JSON.stringify({ data: { imageBase64: resizedBase64 } }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        const visionData = result.result;

        if (visionData && visionData.success && visionData.barcode) {
          const code = visionData.barcode;
          setManualCode(code);
          toast.success(`高精度スキャン成功: ${code}`);
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          onScanSuccess(code);
          return;
        }
      } catch (visionErr: any) {
        // Handle specific error codes or generic failures
        const errorCode = visionErr?.code || 'unknown';
        const errorMessage = visionErr?.message || visionErr.toString();

        if (errorCode === 'not-found') {
          addLog("Vision: バーコードが見つかりませんでした。");
        } else if (errorCode === 'invalid-argument') {
          toast.error(`画像エラー: ${errorMessage}`);
          setIsScanning(false);
          return; // Stop here if it's a client error (size etc)
        } else {
          addLog(`Vision Error [${errorCode}]: ${errorMessage}`);
        }
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
    } finally {
      setIsScanning(false);
      if (e.target) e.target.value = '';
    }
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

    // Simplified duplicate helper removed - uses top-level resizeAndCompressForCloud

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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        const result = await reader.decodeFromImageUrl(dataUrl);
        if (result && result.getText()) return result.getText();
      } catch (e) {
        // Next attempt
      }
    }
    return null;
  }

  // Quagga2 single image scan logic
  async function scanWithQuagga(source: File | string): Promise<string | null> {
    return new Promise((resolve) => {
      const runQuagga = (src: string) => {
        Quagga.decodeSingle({
          src: src,
          numOfWorkers: 0,
          locate: true,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader", "code_128_reader", "code_39_reader"]
          },
          inputStream: { size: 1200 } // Higher resolution for better detection
        }, (result) => {
          if (result && result.codeResult && result.codeResult.code) {
            resolve(result.codeResult.code);
          } else {
            resolve(null);
          }
        });
      };

      if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => runQuagga(e.target?.result as string);
        reader.readAsDataURL(source);
      } else {
        runQuagga(source);
      }
    });
  }

  // Tesseract.js OCR to read numbers directly from barcode image
  async function scanWithTesseract(file: File): Promise<string | null> {
    try {
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: info => console.log(info) // Log progress
        }
      );

      console.log('OCR Raw Text:', text);

      // Remove all spaces and non-digit characters, then look for barcode patterns
      const digitsOnly = text.replace(/[^0-9]/g, '');
      console.log('OCR Digits Only:', digitsOnly);

      // Check for 13-digit (EAN-13) - most common
      if (digitsOnly.length >= 13) {
        // Try to find a valid 13-digit sequence
        const ean13Match = digitsOnly.match(/\d{13}/);
        if (ean13Match) {
          return ean13Match[0];
        }
      }

      // Check for 12-digit (UPC-A)
      if (digitsOnly.length >= 12) {
        const upcMatch = digitsOnly.match(/\d{12}/);
        if (upcMatch) {
          return upcMatch[0];
        }
      }

      // Check for 8-digit (EAN-8)
      if (digitsOnly.length >= 8) {
        const ean8Match = digitsOnly.match(/\d{8}/);
        if (ean8Match) {
          return ean8Match[0];
        }
      }

      return null;
    } catch (error) {
      console.error('Tesseract error:', error);
      return null;
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">バーコード読み取り</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* エラー表示 */}
        {errorMsg && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs whitespace-pre-wrap">
              {errorMsg}
              {/* DEBUG INFO */}
              <div className="mt-2 p-2 bg-black/10 rounded text-[10px] font-mono whitespace-pre-wrap">
                <div className="font-bold mb-1">解析ログ (タップでコピー):</div>
                {debugLog.join("\n")}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 画像からスキャン */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageScan}
            disabled={isScanning}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="画像からスキャン"
          />
          <Button
            variant="default"
            size="lg"
            className="w-full gap-2 py-8 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                高度解析中...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                写真からスキャン
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            もっとも強力な解析エンジンを使用しています
          </p>
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              または
            </span>
          </div>
        </div>

        {/* 手動入力フォーム */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Keyboard className="w-4 h-4" />
            <span>バーコード番号を手動入力</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="13桁の数字を入力"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              pattern="[0-9]*"
              inputMode="numeric"
              className="font-mono text-lg"
            />
            <Button type="submit" disabled={!manualCode} className="px-6">
              生成
            </Button>
          </div>
        </form>

      </CardContent>
    </Card>
  );
}
