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

  // The "Strongest" Image-based barcode detection using ZXing
  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const imageFile = e.target.files[0];
    setIsScanning(true);
    setErrorMsg(null);

    try {
      // Create tips for ZXing
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
        // Try direct decoding from image URL first
        const result = await reader.decodeFromImageUrl(imageUrl);
        setManualCode(result.getText());
        toast.success(`バーコードを検出: ${result.getText()}`);
        URL.revokeObjectURL(imageUrl);
      } catch (err) {
        console.warn("Direct ZXing scan failed, trying with preprocessing...");

        // Fallback: Preprocess with Canvas if direct scan fails
        const resultText = await preprocessAndScan(imageFile, reader);
        if (resultText) {
          setManualCode(resultText);
          toast.success(`バーコードを検出: ${resultText}`);
        } else {
          throw new Error("Could not detect barcode even with preprocessing");
        }
      }
    } catch (error: any) {
      console.error("Image barcode scan failed:", error);
      setErrorMsg("バーコードを読み取れませんでした。画像の中央にはっきりバーコードが来るように撮影してみてください。");
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  // Preprocess image (resize/grayscale/contrast) and try scanning again
  async function preprocessAndScan(file: File, reader: BrowserMultiFormatReader): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);

      img.onload = async () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        // Normalize size
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;

        // Apply filters
        ctx.filter = 'contrast(1.2) b&w';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const result = await reader.decodeFromImageUrl(dataUrl);
          resolve(result.getText());
        } catch (e) {
          // One last try: Rotate 90 degrees (sometimes barcodes are vertical)
          try {
            canvas.width = height;
            canvas.height = width;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, -width / 2, -height / 2, width, height);

            const dataUrlRot = canvas.toDataURL('image/jpeg', 0.9);
            const resultRot = await reader.decodeFromImageUrl(dataUrlRot);
            resolve(resultRot.getText());
          } catch (eRot) {
            resolve(null);
          }
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
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
