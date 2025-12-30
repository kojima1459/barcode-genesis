import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

type SoundType = 'bgm_menu' | 'bgm_battle' | 'se_click' | 'se_scan' | 'se_attack' | 'se_win' | 'se_lose' | 'se_levelup' | 'se_equip';

interface SoundContextType {
  playBGM: (type: 'bgm_menu' | 'bgm_battle') => void;
  stopBGM: () => void;
  playSE: (type: 'se_click' | 'se_scan' | 'se_attack' | 'se_win' | 'se_lose' | 'se_levelup' | 'se_equip') => void;
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
    bgm_menu: '/sounds/bgm_menu.mp3',
    bgm_battle: '/sounds/bgm_battle.mp3',
    se_click: '/sounds/se_click.mp3',
    se_scan: '/sounds/se_scan.mp3',
    se_attack: '/sounds/se_attack.mp3',
    se_win: '/sounds/se_win.mp3',
    se_lose: '/sounds/se_lose.mp3',
    se_levelup: '/sounds/se_levelup.mp3',
    se_equip: '/sounds/se_click.mp3',
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

  const playBGM = (type: 'bgm_menu' | 'bgm_battle') => {
    if (currentBGM === type && bgmRef.current && !bgmRef.current.paused) return;

    if (bgmRef.current) {
      bgmRef.current.pause();
    }

    const audio = new Audio(soundPaths[type]);
    // メニューBGMはループ、バトルBGMは1回のみ再生
    audio.loop = type === 'bgm_menu';
    audio.volume = isMuted ? 0 : volume;
    audio.play().catch(e => console.log('Audio play failed:', e));

    bgmRef.current = audio;
    setCurrentBGM(type);
  };

  const stopBGM = () => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current = null;
      setCurrentBGM(null);
    }
  };

  const playSE = (type: 'se_click' | 'se_scan' | 'se_attack' | 'se_win' | 'se_lose' | 'se_levelup' | 'se_equip') => {
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
  };

  const toggleMute = () => setIsMuted(!isMuted);

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
