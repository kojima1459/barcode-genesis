import { Link, useLocation } from "wouter";
import { BattleIcon, HomeIcon, ProfileIcon, ShopIcon, UnitsIcon } from "@/components/icons/AppIcons";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function BottomNav() {
    const [location] = useLocation();
    const { playSE } = useSound();
    const { t } = useLanguage();

    // Hide on LP, Auth, Legal pages
    const hiddenPaths = ["/lp", "/auth", "/privacy", "/terms", "/law", "/404"];
    if (hiddenPaths.some((path) => location.startsWith(path)) || location === "/lp") {
        return null;
    }

    const navItems = [
        { path: "/", icon: HomeIcon, label: t('home'), ariaLabel: "ホームへ移動" },
        { path: "/battle", icon: BattleIcon, label: t('battle'), ariaLabel: "バトルへ移動" },
        { path: "/collection", icon: UnitsIcon, label: t('units'), ariaLabel: "コレクションへ移動" },
        { path: "/shop", icon: ShopIcon, label: t('shop'), ariaLabel: "ショップへ移動" },
        { path: "/profile", icon: ProfileIcon, label: t('profile'), ariaLabel: "プロフィールへ移動" },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none md:hidden"
            role="navigation"
            aria-label="メインナビゲーション"
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        >
            <div
                className="glass-panel rounded-2xl flex justify-around items-center p-3 pointer-events-auto"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
            >
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
                                    className={`h-5 w-5 ${isActive ? "neon-text-cyan drop-shadow-[0_0_8px_rgba(62,208,240,0.5)]" : ""}`}
                                    aria-hidden="true"
                                />
                                <span className={`text-[10px] font-orbitron tracking-[0.02em] ${isActive ? "text-primary neon-text-cyan" : ""}`}>
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
