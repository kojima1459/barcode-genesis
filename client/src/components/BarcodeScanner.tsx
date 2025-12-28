import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerRegionId = "html5qr-code-full-region";

  useEffect(() => {
    // スキャナーの初期化
    // 注意: React.StrictMode下では2回呼ばれる可能性があるため、クリーンアップが必要
    const scanner = new Html5QrcodeScanner(
      scannerRegionId,
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // スキャン成功時
        scanner.clear();
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        // スキャン失敗時（頻繁に呼ばれるので注意）
        if (onScanFailure) {
          onScanFailure(errorMessage);
        }
      }
    );

    return () => {
      // クリーンアップ
      scanner.clear().catch(error => {
        console.error("Failed to clear html5-qrcode scanner. ", error);
      });
    };
  }, [onScanSuccess, onScanFailure]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Scan Barcode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* カメラエリア */}
        <div id={scannerRegionId} className="w-full overflow-hidden rounded-lg border bg-black/5" />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or enter manually
            </span>
          </div>
        </div>

        {/* 手動入力フォーム */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter barcode number (e.g. 4901234567890)"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            pattern="[0-9]*"
            inputMode="numeric"
          />
          <Button type="submit" disabled={!manualCode}>
            Go
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
