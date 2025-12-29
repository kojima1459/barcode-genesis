import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RobotData } from "@/types/shared";
import RobotCard from "./RobotCard";
import { toBlob } from 'html-to-image';
import { Share2, Download, Loader2, X } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ShareCardModalProps {
    robot: RobotData;
    trigger?: React.ReactNode;
}

export default function ShareCardModal({ robot, trigger }: ShareCardModalProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Ref to the DOM element we want to capture
    // We need to render the card somewhere. If it's hidden with display:none, html-to-image might fail.
    // Best practice: Render it off-screen with absolute positioning but visible visibility? Or inside a hidden container that we reveal for a split second?
    // Actually html-to-image handles elements not attached to document if we pass it, but styles might break.
    // We'll put it in a fixed container off-screen.
    const cardRef = useRef<HTMLDivElement>(null);

    const generateImage = async () => {
        if (!cardRef.current) return;

        setIsGenerating(true);
        try {
            // Small delay to ensure fonts/images are loaded (though fonts is tricky)
            // `toBlob` usually handles fonts if they are webfonts.
            const blob = await toBlob(cardRef.current, {
                width: 600,
                height: 800,
                style: { transform: 'none' } // Reset any transforms
            });

            if (blob) {
                const url = URL.createObjectURL(blob);
                setGeneratedImage(url);
            }
        } catch (error) {
            console.error("Failed to generate card image:", error);
            toast.error("Failed to generate image.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && !generatedImage) {
            // Wait for modal transition/mount then generate
            setTimeout(generateImage, 500);
        }
    };

    const handleShare = async () => {
        if (!generatedImage) return;

        try {
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            const file = new File([blob], `robot_${robot.id}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `${robot.name} - Barcode Genesis`,
                    text: `I generated a ${robot.rarityName} robot from a barcode! #BarcodeGenesis`,
                    files: [file]
                });
                toast.success("Shared successfully!");
            } else {
                // Fallback to download
                const link = document.createElement('a');
                link.href = generatedImage;
                link.download = `robot_${robot.id}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Image downloaded!");
            }
        } catch (error) {
            console.error("Share failed:", error);
            toast.error("Share not supported or failed.");
        }
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

            <DialogContent className="max-w-md w-full bg-black/90 border-neon-cyan/50 text-white p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex flex-col items-center gap-6">
                    <h2 className="text-xl font-orbitron text-neon-cyan">SHARE UNIT DATA</h2>

                    {/* Preview Area */}
                    <div className="relative w-full aspect-[3/4] bg-gray-900 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
                                <span className="text-xs text-muted-foreground">GENERATING CARD...</span>
                            </div>
                        ) : generatedImage ? (
                            <img src={generatedImage} alt="Robot Card" className="w-full h-full object-contain shadow-2xl" />
                        ) : (
                            <div className="text-xs text-muted-foreground">Initialize...</div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 w-full">
                        <Button onClick={handleShare} disabled={!generatedImage || isGenerating} className="flex-1 bg-neon-cyan text-black hover:bg-neon-cyan/80 font-bold">
                            <Share2 className="w-4 h-4 mr-2" /> SHARE
                        </Button>
                        {/* 
                 <Button variant="secondary" onClick={() => setIsOpen(false)}>
                    CLOSE
                 </Button>
                 */}
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">
                        Generated from Barcode Genesis.<br />
                        Scan real barcodes to collect unique robots.
                    </p>
                </div>
            </DialogContent>

            {/* Hidden Card Render Area - render always when open but off-screen */}
            {/* We use 'fixed' and z-index -9999 to keep it in DOM but invisible/uninteractive */}
            {isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
                    <RobotCard
                        ref={cardRef}
                        robot={robot}
                        userName={user?.displayName || "COMMANDER"}
                    />
                </div>
            )}
        </Dialog>
    );
}
