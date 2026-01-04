import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

type SoundType = 'bgm_menu' | 'bgm_battle' | 'se_click' | 'se_scan' | 'se_attack' | 'se_win' | 'se_lose' | 'se_levelup' | 'se_equip' | 'se_reveal' | 'se_rare' | 'se_hit_heavy' | 'se_hit_light' | 'se_miss' | 'se_battle_start';

interface SoundContextType {
  playBGM: (type: 'bgm_menu' | 'bgm_battle') => void;
  stopBGM: () => void;
  playSE: (type: 'se_click' | 'se_scan' | 'se_attack' | 'se_win' | 'se_lose' | 'se_levelup' | 'se_equip' | 'se_reveal' | 'se_rare' | 'se_hit_heavy' | 'se_hit_light' | 'se_miss' | 'se_battle_start') => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentBGM, setCurrentBGM] = useState<'bgm_menu' | 'bgm_battle' | null>(null);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const seRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // 音源ファイルのパス定義
  const soundPaths: Record<SoundType, string> = {
    bgm_menu: '/sfx/bgm_menu.mp3',
    bgm_battle: '/sfx/bgm_battle.mp3',
    se_click: '/sfx/ui_click.mp3',
    se_scan: '/sfx/scan.mp3',
    se_attack: '/sfx/attack.mp3',
    se_win: '/sfx/win.mp3',
    se_lose: '/sfx/lose.mp3',
    se_levelup: '/sfx/levelup.mp3',
    se_equip: '/sfx/ui_click.mp3',
    se_reveal: '/sfx/ui.mp3',
    se_rare: '/sfx/crit.mp3',
    se_hit_heavy: '/sfx/hit_heavy.mp3',
    se_hit_light: '/sfx/hit_light.mp3',
    se_miss: '/sfx/attack.mp3',
    se_battle_start: '/sfx/scan.mp3',
  };

  // 初期化時にSEをプリロード
  useEffect(() => {
    Object.entries(soundPaths).forEach(([key, path]) => {
      if (key.startsWith('se_')) {
        const audio = new Audio(path);
        seRefs.current.set(key, audio);
      }
    });
  }, []);

  // 音量変更時の反映
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = isMuted ? 0 : volume;
    }
    seRefs.current.forEach(audio => {
      audio.volume = isMuted ? 0 : volume;
    });
  }, [volume, isMuted]);

  const playBGM = useCallback((type: 'bgm_menu' | 'bgm_battle', loop: boolean = true) => {
    // If same BGM is already playing...
    if (currentBGM === type && bgmRef.current) {
      // Update loop setting if changed
      if (bgmRef.current.loop !== loop) {
        bgmRef.current.loop = loop;
      }
      // If paused, resume
      if (bgmRef.current.paused) {
        bgmRef.current.play().catch(e => console.log('Audio resume failed:', e));
      }
      return;
    }

    if (bgmRef.current) {
      bgmRef.current.pause();
    }

    const audio = new Audio(soundPaths[type]);
    // Allow custom loop setting
    audio.loop = loop;
    audio.volume = isMuted ? 0 : volume;
    audio.play().catch(e => console.log('Audio play failed:', e));

    bgmRef.current = audio;
    setCurrentBGM(type);
  }, [currentBGM, isMuted, volume]);

  const stopBGM = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current = null;
      setCurrentBGM(null);
    }
  }, []);

  const playSE = useCallback((type: 'se_click' | 'se_scan' | 'se_attack' | 'se_win' | 'se_lose' | 'se_levelup' | 'se_equip' | 'se_reveal' | 'se_rare' | 'se_hit_heavy' | 'se_hit_light' | 'se_miss' | 'se_battle_start') => {
    const audio = seRefs.current.get(type);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = isMuted ? 0 : volume;
      audio.play().catch(e => console.log('SE play failed:', e));
    } else {
      // フォールバック: プリロードされていない場合
      const newAudio = new Audio(soundPaths[type]);
      newAudio.volume = isMuted ? 0 : volume;
      newAudio.play().catch(e => console.log('SE play failed:', e));
    }
  }, [isMuted, volume]);

  const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

  return (
    <SoundContext.Provider value={{ playBGM, stopBGM, playSE, volume, setVolume, isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
