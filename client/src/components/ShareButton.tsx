import { Button } from "@/components/ui/button";
import { Twitter } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShareButtonProps {
  text: string;
  url?: string;
  hashtags?: string[];
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost";
}

export default function ShareButton({ 
  text, 
  url = window.location.origin, 
  hashtags = ["BarcodeGenesis", "BarcodeBattler"],
  className,
  size = "default",
  variant = "outline"
}: ShareButtonProps) {
  const { t } = useLanguage();

  const handleShare = () => {
    const shareUrl = new URL("https://twitter.com/intent/tweet");
    shareUrl.searchParams.set("text", text);
    shareUrl.searchParams.set("url", url);
    if (hashtags.length > 0) {
      shareUrl.searchParams.set("hashtags", hashtags.join(","));
    }

    window.open(shareUrl.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={`gap-2 ${className}`} 
      onClick={handleShare}
    >
      <Twitter className="h-4 w-4" />
      {size !== "icon" && t('share_x')}
    </Button>
  );
}
