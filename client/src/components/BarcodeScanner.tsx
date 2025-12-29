import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useRef, useState } from "react";
import { AlertCircle, Keyboard, Image, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  // The "Strongest" Image-based barcode detection
  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const imageFile = e.target.files[0];
    setIsScanning(true);
    setErrorMsg(null);

    try {
      // 1. Try Native BarcodeDetector API (Strongest where supported)
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore - BarcodeDetector is a newer API
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

      // 2. Try ZXing with hints
      const hints = new Map();
      const formats = [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      const imageUrl = URL.createObjectURL(imageFile);

      try {
        // Try direct decoding first
        const result = await reader.decodeFromImageUrl(imageUrl);
        setManualCode(result.getText());
        toast.success(`バーコードを検出: ${result.getText()}`);
        URL.revokeObjectURL(imageUrl);
      } catch (err) {
        console.warn("Direct ZXing scan failed, trying with multiple preprocessing attempts...");

        // Fallback: Try multiple preprocessing variations
        const resultText = await multiAttemptScaleAndScan(imageFile, reader);
        if (resultText) {
          setManualCode(resultText);
          toast.success(`補正解析で検出: ${resultText}`);
        } else {
          throw new Error("Could not detect barcode even with advanced correction");
        }
      }
    } catch (error: any) {
      console.error("Image barcode scan failed:", error);
      setErrorMsg("バーコードを読み取れませんでした。\n\n【コツ】\n・ピントを合わせて、バーコードが真っ直ぐになるように撮影してください\n・光の反射が入らないように少し角度を変えてみてください");
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  // Try multiple scales and filters to find the barcode
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

    // Try these scales in order: Standard, Large, Small
    const scales = [1000, 1600, 600];
    const filters = [
      'contrast(1.4) grayscale(1)',
      'brightness(1.1) contrast(1.2) grayscale(1)',
      'none'
    ];

    for (const maxDim of scales) {
      for (const filter of filters) {
        let width = img.width;
        let height = img.height;
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        canvas.width = width;
        canvas.height = height;
        ctx.filter = filter;
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const result = await reader.decodeFromImageUrl(dataUrl);
          if (result) return result.getText();
        } catch (e) {
          // Continue to next attempt
        }

        // Tilt attempt (sometimes needed for distorted images)
        try {
          canvas.width = height;
          canvas.height = width;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
          const resultRot = await reader.decodeFromImageUrl(canvas.toDataURL('image/jpeg', 0.95));
          if (resultRot) return resultRot.getText();
        } catch (e) {
          // Continue
        }
      }
    }
    return null;
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
