import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Quagga from "@ericblade/quagga2";
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

  // Image-based barcode detection using Quagga2
  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const imageFile = e.target.files[0];
    setIsScanning(true);
    setErrorMsg(null);

    try {
      // Create image URL
      const imageUrl = URL.createObjectURL(imageFile);

      // Use Quagga2's decodeSingle for image-based detection
      const result = await new Promise<string>((resolve, reject) => {
        Quagga.decodeSingle(
          {
            src: imageUrl,
            numOfWorkers: 0, // Use main thread for single image
            inputStream: {
              size: 1280, // Resize to max 1280px
              singleChannel: false,
            },
            decoder: {
              readers: [
                "ean_reader",      // EAN-13, EAN-8
                "upc_reader",      // UPC-A, UPC-E
                "code_128_reader", // CODE 128
                "code_39_reader",  // CODE 39
              ],
            },
            locate: true, // Try to locate barcode in image
            locator: {
              patchSize: "medium", // Balance between speed and accuracy
              halfSample: true,
            },
          },
          (result) => {
            URL.revokeObjectURL(imageUrl);

            if (result && result.codeResult && result.codeResult.code) {
              resolve(result.codeResult.code);
            } else {
              reject(new Error("Barcode not found"));
            }
          }
        );
      });

      // Barcode detected - auto-fill the manual input field
      setManualCode(result);
      toast.success(`バーコードを検出: ${result}\n「生成」をタップしてください！`);

    } catch (error: any) {
      console.error("Image barcode scan failed:", error);
      setErrorMsg("バーコードを検出できませんでした。\n\n【対処法】\n・バーコード部分を大きく写した画像を使用\n・バーコードに光が反射していないか確認\n・下の番号を直接入力することもできます");
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

      </CardContent>
    </Card>
  );
}
