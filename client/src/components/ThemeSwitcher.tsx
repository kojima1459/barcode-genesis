import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function ThemeSwitcher() {
    const { theme, toggleTheme, switchable } = useTheme();

    if (!switchable || !toggleTheme) {
        return null;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {theme === "dark" ? (
                        <Sun className="h-5 w-5" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {theme === "dark" ? "ライトモード" : "ダークモード"}
            </TooltipContent>
        </Tooltip>
    );
}
