import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RobotData } from "@/types/shared";
import RobotCard from "./RobotCard";
import { Share2, Download, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { generateImageFromElement, shareImage, downloadBlob } from '@/utils/share';

// SVG Icons for social platforms
const XIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const LINEIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
);

const InstagramIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
);

interface ShareCardModalProps {
    robot: RobotData;
    trigger?: React.ReactNode;
}

export default function ShareCardModal({ robot, trigger }: ShareCardModalProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const shareText = `${robot.name} (${robot.rarityName}) をバーコードから生成！ #BarcodeGenesis #バーコードジェネシス`;
    const shareUrl = "https://barcodegame-42858.web.app";

    const generateImage = async () => {
        if (!cardRef.current) {
            console.error('[ShareCardModal] Card ref is null');
            toast.error('カード要素が見つかりません', {
                description: 'ページを再読み込みしてください',
                duration: 5000
            });
            return;
        }

        // Validate robot data
        if (!robot || !robot.parts || !robot.colors) {
            console.error('[ShareCardModal] Invalid robot data:', robot);
            toast.error('ロボットデータが不正です', {
                description: 'もう一度スキャンしてください',
                duration: 5000
            });
            return;
        }

        // Wait for element to be visible
        const rect = cardRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.warn('[ShareCardModal] Card element has zero size, waiting...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setIsGenerating(true);
        try {
            console.log('[ShareCardModal] Starting image generation for robot:', robot.name);
            console.log('[ShareCardModal] Robot data:', { id: robot.id, rarity: robot.rarity, parts: !!robot.parts, colors: !!robot.colors });

            const blob = await generateImageFromElement(cardRef.current, {
                width: 600,
                height: 800,
                retries: 2
            });

            if (blob) {
                const url = URL.createObjectURL(blob);
                setGeneratedImage(url);
                setGeneratedBlob(blob);
                console.log('[ShareCardModal] Image generated successfully:', blob.size, 'bytes');
            } else {
                console.error('[ShareCardModal] Image generation returned null');
                toast.error('画像生成に失敗しました', {
                    description: 'カードの読み込みに時間がかかっている可能性があります。もう一度お試しください。',
                    duration: 5000
                });
            }
        } catch (error) {
            console.error('[ShareCardModal] Image generation error:', error);
            console.error('[ShareCardModal] Error stack:', error instanceof Error ? error.stack : 'No stack');
            console.error('[ShareCardModal] Robot causing error:', { name: robot.name, id: robot.id });
            toast.error('画像生成に失敗しました', {
                description: error instanceof Error ? error.message : '不明なエラー',
                duration: 5000
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && !generatedImage) {
            setTimeout(generateImage, 500);
        }
    };

    // Download image
    const handleDownload = () => {
        if (!generatedBlob) {
            console.error('[ShareCardModal] No blob available for download');
            toast.error('画像が生成されていません');
            return;
        }

        const filename = `robot_${robot.id}_${robot.name}.png`;
        const success = downloadBlob(generatedBlob, filename);

        if (!success) {
            toast.error('ダウンロードに失敗しました');
        }
    };

    // Share to X (Twitter)
    const shareToX = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'width=550,height=420');
        toast("Xで画像を添付してシェアしてね！", { icon: "📸" });
    };

    // Share to LINE
    const shareToLINE = () => {
        const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'width=550,height=420');
        toast("LINEで画像を添付してシェアしてね！", { icon: "📸" });
    };

    // Share to Instagram (opens Instagram app on mobile, download on desktop)
    const shareToInstagram = async () => {
        // Instagram doesn't have a web share API - must use native app
        // Best we can do is download the image and prompt user
        handleDownload();
        toast("画像を保存しました。Instagramアプリで投稿してください！", { icon: "📸", duration: 5000 });
    };

    // Native share with comprehensive fallbacks
    const handleNativeShare = async () => {
        if (!generatedBlob) {
            console.error('[ShareCardModal] No blob available for sharing');
            toast.error('画像が生成されていません');
            return;
        }

        console.log('[ShareCardModal] Initiating share for robot:', robot.name);

        const filename = `robot_${robot.id}_${robot.name}.png`;
        const result = await shareImage(
            generatedBlob,
            filename,
            {
                title: `${robot.name} - Barcode Genesis`,
                text: shareText,
                url: shareUrl
            }
        );

        console.log('[ShareCardModal] Share result:', result);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Share2 className="w-4 h-4" /> Share Card
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="max-w-md w-full bg-black/95 border-cyan-500/30 text-white p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex flex-col items-center gap-6">
                    <h2 className="text-xl font-orbitron text-cyan-400 tracking-wider">SHARE UNIT DATA</h2>

                    {/* Preview Area */}
                    <div className="relative w-full aspect-[3/4] bg-gray-900 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                                <span className="text-xs text-gray-400">GENERATING CARD...</span>
                            </div>
                        ) : generatedImage ? (
                            <img src={generatedImage} alt="Robot Card" className="w-full h-full object-contain shadow-2xl" />
                        ) : (
                            <div className="text-xs text-gray-400">Initialize...</div>
                        )}
                    </div>

                    {/* Social Share Buttons */}
                    <div className="w-full space-y-3">
                        <p className="text-xs text-gray-400 text-center">シェア先を選択</p>

                        <div className="grid grid-cols-3 gap-3">
                            {/* X (Twitter) */}
                            <button
                                onClick={shareToX}
                                disabled={!generatedImage || isGenerating}
                                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-black border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all disabled:opacity-50"
                            >
                                <XIcon />
                                <span className="text-[10px] font-medium">X</span>
                            </button>

                            {/* LINE */}
                            <button
                                onClick={shareToLINE}
                                disabled={!generatedImage || isGenerating}
                                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#06C755]/10 border border-[#06C755]/30 hover:border-[#06C755]/60 hover:bg-[#06C755]/20 transition-all disabled:opacity-50 text-[#06C755]"
                            >
                                <LINEIcon />
                                <span className="text-[10px] font-medium">LINE</span>
                            </button>

                            {/* Instagram */}
                            <button
                                onClick={shareToInstagram}
                                disabled={!generatedImage || isGenerating}
                                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gradient-to-tr from-yellow-500/10 via-pink-500/10 to-purple-500/10 border border-pink-500/30 hover:border-pink-500/60 transition-all disabled:opacity-50 text-pink-400"
                            >
                                <InstagramIcon />
                                <span className="text-[10px] font-medium">Instagram</span>
                            </button>
                        </div>

                        {/* Download & Native Share */}
                        <div className="flex gap-3">
                            <Button
                                onClick={handleDownload}
                                disabled={!generatedImage || isGenerating}
                                variant="outline"
                                className="flex-1 border-white/20 hover:border-white/40"
                            >
                                <Download className="w-4 h-4 mr-2" /> 保存
                            </Button>
                            <Button
                                onClick={handleNativeShare}
                                disabled={!generatedImage || isGenerating}
                                className="flex-1 bg-cyan-500 text-black hover:bg-cyan-400 font-bold"
                            >
                                <Share2 className="w-4 h-4 mr-2" /> その他
                            </Button>
                        </div>
                    </div>

                    <p className="text-[10px] text-gray-500 text-center">
                        Barcode Genesis - バーコードからロボットを生成
                    </p>
                </div>
            </DialogContent>

            {/* Hidden Card Render Area */}
            {isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
                    <RobotCard
                        ref={cardRef}
                        robot={robot}
                        userName={user?.displayName || "COMMANDER"}
                        staticMode={true}
                    />
                </div>
            )}
        </Dialog>
    );
}
