import { Link, useLocation } from "wouter";
import { Home, Swords, Grid, ShoppingBag, User } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";

export default function BottomNav() {
    const [location] = useLocation();
    const { playSE } = useSound();

    // Hide on LP, Auth, Legal pages
    const hiddenPaths = ["/lp", "/auth", "/privacy", "/terms", "/law", "/404"];
    if (hiddenPaths.some((path) => location.startsWith(path)) || location === "/lp") {
        return null;
    }

    const navItems = [
        { path: "/", icon: Home, label: "HOME", ariaLabel: "ホームへ移動" },
        { path: "/battle", icon: Swords, label: "BATTLE", ariaLabel: "バトルへ移動" },
        { path: "/collection", icon: Grid, label: "UNITS", ariaLabel: "コレクションへ移動" },
        { path: "/shop", icon: ShoppingBag, label: "SHOP", ariaLabel: "ショップへ移動" },
        { path: "/profile", icon: User, label: "PROFILE", ariaLabel: "プロフィールへ移動" },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none md:hidden"
            role="navigation"
            aria-label="メインナビゲーション"
        >
            <div className="glass-panel rounded-2xl flex justify-around items-center p-3 pointer-events-auto">
                {navItems.map((item) => {
                    const isActive = location === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            onClick={() => playSE('se_click')}
                            aria-label={item.ariaLabel}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <div
                                className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px] min-h-[48px] justify-center ${isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <item.icon
                                    className={`h-6 w-6 ${isActive ? "neon-text-cyan drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]" : ""}`}
                                    strokeWidth={isActive ? 2.5 : 1.5}
                                    aria-hidden="true"
                                />
                                <span className={`text-[10px] font-orbitron tracking-wider ${isActive ? "text-primary neon-text-cyan" : ""}`}>
                                    {item.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
