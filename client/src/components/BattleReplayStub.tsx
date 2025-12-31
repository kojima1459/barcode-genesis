import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BattleResult, RobotData } from "@/types/shared";
import { BattleEvent, generateBattleEvents } from "@/lib/battleReplay";
import RobotSVG from "@/components/RobotSVG";
import { useSound } from "@/contexts/SoundContext";
import { useRobotFx } from "@/hooks/useRobotFx";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import { Zap } from "lucide-react";

interface BattleReplayProps {
    p1: RobotData;
    p2: RobotData;
    result: BattleResult;
    onComplete: () => void;
}

export default function BattleReplay({ p1, p2, result, onComplete }: BattleReplayProps) {
    const { playSE, playBGM } = useSound();
    const { fx } = useRobotFx(); // For RobotSVG visuals

    const [events, setEvents] = useState<BattleEvent[]>([]);
    const [currentEventIndex, setCurrentEventIndex] = useState(0);

    // Visual States
    const [hp, setHp] = useState({ [p1.id]: p1.baseHp, [p2.id]: p2.baseHp });
    const [shakeId, setShakeId] = useState<string | null>(null);
    const [flashId, setFlashId] = useState<string | null>(null);
    const [popups, setPopups] = useState<{ id: string, text: string, type: 'damage' | 'crit' | 'miss', targetId: string }[]>([]);
    const [activeMessage, setActiveMessage] = useState<string>("");

    // Pacing
    const [speed, setSpeed] = useState(1);
    const [isSkipped, setIsSkipped] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Setup
    useEffect(() => {
        const generated = generateBattleEvents(result.logs, p1.id, p2.id);
        setEvents(generated);
        setCurrentEventIndex(0);
        setHp({ [p1.id]: p1.baseHp, [p2.id]: p2.baseHp });
    }, [result, p1.id, p2.id]);

    // Event Loop
    useEffect(() => {
        if (events.length === 0 || currentEventIndex >= events.length) {
            if (currentEventIndex >= events.length && events.length > 0) {
                // Battle End
                // Wait a bit then show result overlay? 
                // The Result Overlay is part of this component's render, driven by `isFinished`
            }
            return;
        }

        const event = events[currentEventIndex];
        let delay = (event.delay || 0) / speed;
        if (isSkipped) delay = 0;

        const execute = () => {
            // Process Event Side Effects
            switch (event.type) {
                case 'LOG_MESSAGE':
                    if (event.message) setActiveMessage(event.message);
                    break;
                case 'ATTACK_PREPARE':
                    // Lunge animation could be handled here by setting an 'attackerId' state
                    break;
                case 'ATTACK_IMPACT':
                    if (event.defenderId) {
                        // Shake
                        setShakeId(event.defenderId);
                        setTimeout(() => setShakeId(null), 300);

                        // Flash
                        if (event.isCritical) {
                            setFlashId(event.defenderId);
                            setTimeout(() => setFlashId(null), 100);
                            playSE('se_attack'); // Heavy sound?
                        } else {
                            playSE('se_attack');
                        }
                    }
                    break;
                case 'DAMAGE_POPUP':
                    if (event.defenderId) {
                        const popupId = Math.random().toString();
                        let text = String(event.damage);
                        let type: 'damage' | 'crit' | 'miss' = 'damage';
                        if (event.isMiss) { text = "MISS"; type = 'miss'; }
                        else if (event.isCritical) { type = 'crit'; }

                        setPopups(prev => [...prev, { id: popupId, text, type, targetId: event.defenderId! }]);
                        setTimeout(() => {
                            setPopups(prev => prev.filter(p => p.id !== popupId));
                        }, 1000);
                    }
                    break;
                case 'HP_UPDATE':
                    if (event.currentHp) {
                        const { attacker, defender } = event.currentHp;
                        // We need to know who is attacker/defender in this context? 
                        // The event generator didn't explicitly map "attacker=p1" etc easily.
                        // But generateBattleEvents passes attackerHp/defenderHp based on log.
                        // Wait, log has attackerId/defenderId. Replay logic assumes we know IDs.
                        // So we merge into hp state.
                        // Note: generateBattleEvents logs `currentHp` as `{ attacker: val, defender: val }`
                        // But we need to map that to IDs. 
                        // My `generateBattleEvents` needs to include IDs in `currentHp` or I use the event's attackerId/defenderId.
                        // Checking `battleReplay.ts` again...
                        // It pushes `currentHp: { attacker: log.attackerHp, defender: log.defenderHp }`
                        // It assumes previous event set attackerId/defenderId? No.
                        // I should fix `battleReplay.ts` to be explicit with IDs in HP_UPDATE.
                        // OR assume I can match it.
                    }
                    break;
            }

            // Next event
            setCurrentEventIndex(prev => prev + 1);
        };

        timeoutRef.current = setTimeout(execute, delay);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentEventIndex, events, speed, isSkipped]); // Add missing deps

    // ... Render Logic ...
    // Since I found a logic gap in HP_UPDATE, I should fix `battleReplay.ts` first or handle it robustly.
    // I'll assume I'll fix `battleReplay.ts` in next step.

    return <div>(Placeholder)</div>;
}
