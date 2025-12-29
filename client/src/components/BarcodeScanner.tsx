import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useRef, useState } from "react";
import { AlertCircle, Keyboard, Image, Loader2 } from "lucide-react";
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

  // Image-based barcode detection with preprocessing
  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const imageFile = e.target.files[0];
    setIsScanning(true);
    setErrorMsg(null);

    try {
      // Create image element to load the file
      const img = document.createElement('img');
      const imageUrl = URL.createObjectURL(imageFile);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = imageUrl;
      });

      // Create canvas and draw image (helps with detection)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Scale down if too large (improves detection)
      const maxDimension = 1000;
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob for scanning
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob conversion failed')), 'image/jpeg', 0.9);
      });
      const processedFile = new File([blob], 'processed.jpg', { type: 'image/jpeg' });

      URL.revokeObjectURL(imageUrl);

      // Try scanning with html5-qrcode
      const html5QrCode = new Html5Qrcode("barcode-scanner-temp", {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39
        ]
      });

      const result = await html5QrCode.scanFile(processedFile, true);

      // Barcode detected - auto-fill the manual input field
      setManualCode(result);
      toast.success(`バーコードを検出: ${result}`);

      html5QrCode.clear();
    } catch (error: any) {
      console.error("Image barcode scan failed:", error);
      setErrorMsg("バーコードを検出できませんでした。\n\n【対処法】\n・バーコードの数字を下の欄に直接入力してください\n・画像は「4903110475118」のような13桁の数字です");
    } finally {
      setIsScanning(false);
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
            className="w-full gap-2 py-6 text-base"
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                スキャン中...
              </>
            ) : (
              <>
                <Image className="w-5 h-5" />
                画像からバーコードを読み取る
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-1">
            カメラで撮影 or ギャラリーから選択
          </p>
        </div>

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

        {/* 手動入力フォーム */}
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
            />
            <Button type="submit" disabled={!manualCode} size="lg">
              生成
            </Button>
          </div>
        </form>

        {/* Hidden element for html5-qrcode scanFile */}
        <div id="barcode-scanner-temp" className="hidden" />

      </CardContent>
    </Card>
  );
}
