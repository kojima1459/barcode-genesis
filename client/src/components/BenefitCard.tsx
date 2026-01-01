import { Card, CardContent } from "@/components/ui/card";
import { ElementType } from "react";

interface BenefitCardProps {
    icon: ElementType;
    color: string;
    title: string;
    desc: string;
}

export function BenefitCard({ icon: Icon, color, title, desc }: BenefitCardProps) {
    return (
        <Card className="bg-black/40 border-white/10 hover:border-white/20 transition-colors">
            <CardContent className="p-4 flex gap-4 items-start">
                <div className={`p-2 rounded bg-white/5 border border-white/5 ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className={`font-bold text-sm mb-1 ${color}`}>{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
            </CardContent>
        </Card>
    );
}
