# DIAGNOSE LOG

## Environment
- workdir: /Users/masahidekojima/barcode-genesis
- date: 2026-01-03 22:46:15 +0900
- packageManager (package.json): pnpm@10.4.1

## Command Logs (in order)

### 1) node -v
```
v24.12.0
```

### 2) npm -v
```
11.6.2
```

### 3) npm ci (attempt 1)
```
command timed out after 10031 milliseconds
```

### 3) npm ci (attempt 2)
```
npm warn deprecated hast@1.0.0: Renamed to rehype
npm warn deprecated sourcemap-codec@1.4.8: Please use @jridgewell/sourcemap-codec instead
npm warn deprecated source-map@0.8.0-beta.0: The work that was done in this beta branch won't be included in future versions

added 1218 packages, and audited 1219 packages in 9s

303 packages are looking for funding
  run `npm fund` for details

5 vulnerabilities (4 moderate, 1 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

### 4) npm run lint
```

> barcode-genesis@1.1.0 lint
> eslint client/src


/Users/masahidekojima/barcode-genesis/client/src/App.tsx
  18:10  warning  'Loader2' is defined but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/AdBanner.tsx
  115:32  warning  The ref value 'bannerRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'bannerRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/components/AppShell.tsx
    3:10  warning  'Coins' is defined but never used                                                                     @typescript-eslint/no-unused-vars
    3:17  warning  'Factory' is defined but never used                                                                   @typescript-eslint/no-unused-vars
    3:26  warning  'Gift' is defined but never used                                                                      @typescript-eslint/no-unused-vars
   26:11  warning  'credits' is assigned a value but never used                                                          @typescript-eslint/no-unused-vars
   26:42  warning  'workshopLines' is assigned a value but never used                                                    @typescript-eslint/no-unused-vars
   29:10  warning  'dailyFreeStatus' is assigned a value but never used                                                  @typescript-eslint/no-unused-vars
   29:27  warning  'setDailyFreeStatus' is assigned a value but never used                                               @typescript-eslint/no-unused-vars
   97:6   warning  React Hook useEffect has a missing dependency: 't'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  101:9   warning  'navItems' is assigned a value but never used                                                         @typescript-eslint/no-unused-vars
  109:5   warning  React Hook useMemo has a missing dependency: 't'. Either include it or remove the dependency array    react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/components/BarcodeScanner.tsx
   11:27  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   59:37  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   75:27  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  148:21  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  281:41  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  283:16  warning  'e' is defined but never used             @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/BattleEffects.tsx
   1:18  warning  'AnimatePresence' is defined but never used          @typescript-eslint/no-unused-vars
  26:7   warning  'getElementIcon' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/BattleHUDExtended.tsx
  61:8  warning  React Hook useMemo has an unnecessary dependency: 'p2Id'. Either exclude it or remove the dependency array  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/components/BattleReplay.tsx
   12:8    warning  'ShareButton' is defined but never used                                                                                                                                                                                                                                                              @typescript-eslint/no-unused-vars
   20:10   warning  'PLAY_STEP_MS' is defined but never used                                                                                                                                                                                                                                                             @typescript-eslint/no-unused-vars
   20:24   warning  'IMPORTANT_EVENT_BONUS_MS' is defined but never used                                                                                                                                                                                                                                                 @typescript-eslint/no-unused-vars
   20:50   warning  'getImpactIntensity' is defined but never used                                                                                                                                                                                                                                                       @typescript-eslint/no-unused-vars
   20:70   warning  'isImportantLog' is defined but never used                                                                                                                                                                                                                                                           @typescript-eslint/no-unused-vars
   82:13   warning  'playSE' is assigned a value but never used                                                                                                                                                                                                                                                          @typescript-eslint/no-unused-vars
  100:12   warning  'flashId' is assigned a value but never used                                                                                                                                                                                                                                                         @typescript-eslint/no-unused-vars
  100:21   warning  'setFlashId' is assigned a value but never used                                                                                                                                                                                                                                                      @typescript-eslint/no-unused-vars
  117:12   warning  'flashP1' is assigned a value but never used                                                                                                                                                                                                                                                         @typescript-eslint/no-unused-vars
  118:12   warning  'flashP2' is assigned a value but never used                                                                                                                                                                                                                                                         @typescript-eslint/no-unused-vars
  119:12   warning  'showResultsOnly' is assigned a value but never used                                                                                                                                                                                                                                                 @typescript-eslint/no-unused-vars
  139:11   warning  'prefersReducedMotion' is assigned a value but never used                                                                                                                                                                                                                                            @typescript-eslint/no-unused-vars
  150:8    warning  React Hook useEffect has missing dependencies: 'isMuted', 'p1.baseHp', 'p2.baseHp', and 'playBGM'. Either include them or remove the dependency array. If 'setHp' needs the current value of 'p1.baseHp', you can also switch to useReducer instead of useState and read 'p1.baseHp' in the reducer  react-hooks/exhaustive-deps
  197:21   error    Unexpected lexical declaration in case block                                                                                                                                                                                                                                                         no-case-declarations
  346:8    warning  React Hook useEffect has missing dependencies: 'handleBattleEnd', 'lastHp', 'p1', 'p2', and 'shake'. Either include them or remove the dependency array                                                                                                                                              react-hooks/exhaustive-deps
  667:102  warning  Unexpected any. Specify a different type                                                                                                                                                                                                                                                             @typescript-eslint/no-explicit-any
  714:33   warning  Unexpected any. Specify a different type                                                                                                                                                                                                                                                             @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/components/BattleReplayStub.tsx
    2:10  warning  'motion' is defined but never used                                                                                                                                                                                                                                            @typescript-eslint/no-unused-vars
    2:18  warning  'AnimatePresence' is defined but never used                                                                                                                                                                                                                                   @typescript-eslint/no-unused-vars
    5:8   warning  'RobotSVG' is defined but never used                                                                                                                                                                                                                                          @typescript-eslint/no-unused-vars
    8:10  warning  'CountUp' is defined but never used                                                                                                                                                                                                                                           @typescript-eslint/no-unused-vars
    9:10  warning  'Button' is defined but never used                                                                                                                                                                                                                                            @typescript-eslint/no-unused-vars
   10:8   warning  'ShareButton' is defined but never used                                                                                                                                                                                                                                       @typescript-eslint/no-unused-vars
   11:10  warning  'Zap' is defined but never used                                                                                                                                                                                                                                               @typescript-eslint/no-unused-vars
   20:56  warning  'onComplete' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                                                                                  @typescript-eslint/no-unused-vars
   21:21  warning  'playBGM' is assigned a value but never used                                                                                                                                                                                                                                  @typescript-eslint/no-unused-vars
   22:13  warning  'fx' is assigned a value but never used                                                                                                                                                                                                                                       @typescript-eslint/no-unused-vars
   28:12  warning  'hp' is assigned a value but never used                                                                                                                                                                                                                                       @typescript-eslint/no-unused-vars
   29:12  warning  'shakeId' is assigned a value but never used                                                                                                                                                                                                                                  @typescript-eslint/no-unused-vars
   30:12  warning  'flashId' is assigned a value but never used                                                                                                                                                                                                                                  @typescript-eslint/no-unused-vars
   31:12  warning  'popups' is assigned a value but never used                                                                                                                                                                                                                                   @typescript-eslint/no-unused-vars
   32:12  warning  'activeMessage' is assigned a value but never used                                                                                                                                                                                                                            @typescript-eslint/no-unused-vars
   35:19  warning  'setSpeed' is assigned a value but never used                                                                                                                                                                                                                                 @typescript-eslint/no-unused-vars
   36:23  warning  'setIsSkipped' is assigned a value but never used                                                                                                                                                                                                                             @typescript-eslint/no-unused-vars
   45:8   warning  React Hook useEffect has missing dependencies: 'p1.baseHp' and 'p2.baseHp'. Either include them or remove the dependency array. If 'setHp' needs the current value of 'p1.baseHp', you can also switch to useReducer instead of useState and read 'p1.baseHp' in the reducer  react-hooks/exhaustive-deps
  103:33  warning  'attacker' is assigned a value but never used                                                                                                                                                                                                                                 @typescript-eslint/no-unused-vars
  103:43  warning  'defender' is assigned a value but never used                                                                                                                                                                                                                                 @typescript-eslint/no-unused-vars
  129:8   warning  React Hook useEffect has a missing dependency: 'playSE'. Either include it or remove the dependency array                                                                                                                                                                     react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/components/CollectionSlot.tsx
  13:24  warning  Unexpected any. Specify a different type                                @typescript-eslint/no-explicit-any
  14:25  warning  Unexpected any. Specify a different type                                @typescript-eslint/no-explicit-any
  37:55  warning  'role' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/ErrorBoundary.tsx
  1:10  warning  'cn' is defined but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/EvolutionModal.tsx
  76:95  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  80:25  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/components/FusionAnimation.tsx
   6:25  warning  'X' is defined but never used                                                                              @typescript-eslint/no-unused-vars
  44:8   warning  React Hook useEffect has a missing dependency: 'playSE'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/components/GenerationAnimation.tsx
   5:10  warning  'Loader2' is defined but never used                                                                                                                                                                                                                                   @typescript-eslint/no-unused-vars
   5:40  warning  'Fingerprint' is defined but never used                                                                                                                                                                                                                               @typescript-eslint/no-unused-vars
  52:8   warning  React Hook useEffect has missing dependencies: 'onComplete', 'playSE', and 'triggerHaptic'. Either include them or remove the dependency array. If 'onComplete' changes too often, find the parent component that defines it and wrap that definition in useCallback  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/components/GlobalHeader.tsx
   1:10  warning  'useState' is defined but never used                                        @typescript-eslint/no-unused-vars
   1:20  warning  'useEffect' is defined but never used                                       @typescript-eslint/no-unused-vars
   2:10  warning  'Link' is defined but never used                                            @typescript-eslint/no-unused-vars
   6:37  warning  'Target' is defined but never used                                          @typescript-eslint/no-unused-vars
   6:45  warning  'Shield' is defined but never used                                          @typescript-eslint/no-unused-vars
  16:43  warning  'missions' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
  17:13  warning  'user' is assigned a value but never used                                   @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/LazyRender.tsx
  24:105  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/components/MilestoneBossCard.tsx
   8:10  warning  'Link' is defined but never used                                                 @typescript-eslint/no-unused-vars
  28:5   warning  'nextMilestone' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/RobotCard.tsx
  36:88  warning  'originalItemName' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/RobotSVG.tsx
   66:9   warning  The 'safeParts' conditional could make the dependencies of useMemo Hook (at line 79) change on every render. To fix this, wrap the initialization of 'safeParts' in its own useMemo() Hook  react-hooks/exhaustive-deps
  106:11  warning  'sensorColor' is assigned a value but never used                                                                                                                                            @typescript-eslint/no-unused-vars
  154:9   warning  'renderParts' is assigned a value but never used                                                                                                                                            @typescript-eslint/no-unused-vars
  476:11  warning  'center' is assigned a value but never used                                                                                                                                                 @typescript-eslint/no-unused-vars
  795:8   error    Unexpected constant truthiness on the left-hand side of a `&&` expression                                                                                                                   no-constant-binary-expression

/Users/masahidekojima/barcode-genesis/client/src/components/TutorialOverlay.tsx
   1:31  warning  'useRef' is defined but never used                     @typescript-eslint/no-unused-vars
   4:10  warning  'ArrowUp' is defined but never used                    @typescript-eslint/no-unused-vars
   4:19  warning  'ArrowDown' is defined but never used                  @typescript-eslint/no-unused-vars
   4:30  warning  'ArrowLeft' is defined but never used                  @typescript-eslint/no-unused-vars
   4:41  warning  'ArrowRight' is defined but never used                 @typescript-eslint/no-unused-vars
  57:9   error    'intervalId' is never reassigned. Use 'const' instead  prefer-const

/Users/masahidekojima/barcode-genesis/client/src/components/WeeklyBossCard.tsx
  26:5  warning  'lastResult' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/ui/EmptyState.tsx
  1:17  warning  'ReactNode' is defined but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/components/ui/ScrambleText.tsx
   40:12  warning  'isAnimating' is assigned a value but never used                                                                @typescript-eslint/no-unused-vars
  120:8   warning  React Hook useEffect has a missing dependency: 'displayText'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/components/ui/button.tsx
  91:21  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/components/ui/calendar.tsx
  188:21  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/components/ui/dialog.tsx
  107:42  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/components/ui/input.tsx
  25:45  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/components/ui/textarea.tsx
  24:45  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/contexts/SoundContext.tsx
  52:6  warning  React Hook useEffect has a missing dependency: 'soundPaths'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/hooks/useBattleEvents.ts
  9:21  warning  'BattleResult' is defined but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/hooks/useBattleLogic.ts
    1:20   warning  'useEffect' is defined but never used                                   @typescript-eslint/no-unused-vars
    1:31   warning  'useRef' is defined but never used                                      @typescript-eslint/no-unused-vars
    6:35   warning  'BattleLog' is defined but never used                                   @typescript-eslint/no-unused-vars
   12:11   warning  Unexpected any. Specify a different type                                @typescript-eslint/no-explicit-any
   20:15   warning  Unexpected any. Specify a different type                                @typescript-eslint/no-explicit-any
   25:5    warning  'user' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
   36:13   warning  'playSE' is assigned a value but never used                             @typescript-eslint/no-unused-vars
   59:107  warning  Unexpected any. Specify a different type                                @typescript-eslint/no-explicit-any
   78:36   warning  'qId' is defined but never used. Allowed unused args must match /^_/u   @typescript-eslint/no-unused-vars
   79:15   warning  'checkMatchStatus' is assigned a value but never used                   @typescript-eslint/no-unused-vars
   80:15   warning  'poll' is assigned a value but never used                               @typescript-eslint/no-unused-vars
  170:50   warning  Unexpected any. Specify a different type                                @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/hooks/usePersistFn.ts
  3:23  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  3:33  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/hooks/useScreenShake.ts
  1:10  warning  'useEffect' is defined but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/hooks/useUserData.tsx
  17:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  18:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/lib/battleEngine.ts
   659:7   warning  'getSpecialMove' is assigned a value but never used      @typescript-eslint/no-unused-vars
   683:11  warning  'maxHp1' is assigned a value but never used              @typescript-eslint/no-unused-vars
   684:11  warning  'maxHp2' is assigned a value but never used              @typescript-eslint/no-unused-vars
   722:11  warning  'p1SpecialUsed' is assigned a value but never used       @typescript-eslint/no-unused-vars
   723:11  warning  'p2SpecialUsed' is assigned a value but never used       @typescript-eslint/no-unused-vars
   724:11  warning  'p1SpecialRequested' is assigned a value but never used  @typescript-eslint/no-unused-vars
   725:11  warning  'p2SpecialRequested' is assigned a value but never used  @typescript-eslint/no-unused-vars
   867:21  error    Unexpected lexical declaration in case block             no-case-declarations
   872:21  error    Unexpected lexical declaration in case block             no-case-declarations
   884:21  error    Unexpected lexical declaration in case block             no-case-declarations
  1317:42  warning  Unexpected any. Specify a different type                 @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/lib/battleLogToEvents.ts
  14:5  warning  'BattleSfxName' is defined but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/lib/battleReplay.ts
   1:21  warning  'RobotData' is defined but never used                                    @typescript-eslint/no-unused-vars
  93:24  warning  'index' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/lib/bingoUtils.ts
   7:23  warning  'setDoc' is defined but never used           @typescript-eslint/no-unused-vars
   7:42  warning  'serverTimestamp' is defined but never used  @typescript-eslint/no-unused-vars
  15:16  warning  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/lib/dexRegistry.ts
  116:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  121:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/lib/firebase.ts
   62:29  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   72:27  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   82:34  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   92:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  137:16  warning  'e' is defined but never used             @typescript-eslint/no-unused-vars
  142:34  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  150:14  warning  'e' is defined but never used             @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/lib/firebaseLazy.ts
  41:7  warning  'isInitializing' is assigned a value but never used  @typescript-eslint/no-unused-vars
  42:7  warning  'initPromise' is assigned a value but never used     @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/lib/functions.ts
   4:11  warning  'GenerateRobotRequest' is defined but never used  @typescript-eslint/no-unused-vars
  10:12  warning  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  30:23  warning  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  36:21  warning  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/pages/Achievements.tsx
   5:10  warning  'Card' is defined but never used              @typescript-eslint/no-unused-vars
  15:19  warning  Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any
  29:12  warning  'loading' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/pages/Auth.tsx
   4:19  warning  'ShieldCheck' is defined but never used   @typescript-eslint/no-unused-vars
   4:37  warning  'Terminal' is defined but never used      @typescript-eslint/no-unused-vars
   4:47  warning  'ChevronDown' is defined but never used   @typescript-eslint/no-unused-vars
  13:11  warning  't' is assigned a value but never used    @typescript-eslint/no-unused-vars
  61:21  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/pages/Battle.tsx
    5:17  warning  'functions' is defined but never used                      @typescript-eslint/no-unused-vars
    6:55  warning  'onSnapshot' is defined but never used                     @typescript-eslint/no-unused-vars
    7:10  warning  'httpsCallable' is defined but never used                  @typescript-eslint/no-unused-vars
   14:48  warning  'MatchBattleResponse' is defined but never used            @typescript-eslint/no-unused-vars
   15:8   warning  'ShareButton' is defined but never used                    @typescript-eslint/no-unused-vars
   19:3   warning  'StatIconATK' is defined but never used                    @typescript-eslint/no-unused-vars
   20:3   warning  'StatIconDEF' is defined but never used                    @typescript-eslint/no-unused-vars
   21:3   warning  'RoleIconSpeed' is defined but never used                  @typescript-eslint/no-unused-vars
   22:3   warning  'RoleIconTricky' is defined but never used                 @typescript-eslint/no-unused-vars
   26:11  warning  'playBattleSfx' is defined but never used                  @typescript-eslint/no-unused-vars
   29:13  warning  'unlockBattleSfx' is defined but never used                @typescript-eslint/no-unused-vars
   30:3   warning  'playGenerated' is defined but never used                  @typescript-eslint/no-unused-vars
   36:10  warning  'AnimatedHPBar' is defined but never used                  @typescript-eslint/no-unused-vars
   40:10  warning  'CountUp' is defined but never used                        @typescript-eslint/no-unused-vars
   41:28  warning  'simulateTrainingBattle' is defined but never used         @typescript-eslint/no-unused-vars
   41:52  warning  'getTrainingBattleId' is defined but never used            @typescript-eslint/no-unused-vars
   41:73  warning  'normalizeTrainingInput' is defined but never used         @typescript-eslint/no-unused-vars
   41:97  warning  'toBattleRobotData' is defined but never used              @typescript-eslint/no-unused-vars
   52:9   warning  'prefersReducedMotion' is assigned a value but never used  @typescript-eslint/no-unused-vars
   53:11  warning  'fx' is assigned a value but never used                    @typescript-eslint/no-unused-vars
   53:15  warning  'trigger' is assigned a value but never used               @typescript-eslint/no-unused-vars
   66:23  warning  'setEnemyRobots' is assigned a value but never used        @typescript-eslint/no-unused-vars
   72:10  warning  'currentLogIndex' is assigned a value but never used       @typescript-eslint/no-unused-vars
   72:27  warning  'setCurrentLogIndex' is assigned a value but never used    @typescript-eslint/no-unused-vars
   73:10  warning  'damagePopups' is assigned a value but never used          @typescript-eslint/no-unused-vars
   73:24  warning  'setDamagePopups' is assigned a value but never used       @typescript-eslint/no-unused-vars
   77:10  warning  'playbackSpeed' is assigned a value but never used         @typescript-eslint/no-unused-vars
   77:25  warning  'setPlaybackSpeed' is assigned a value but never used      @typescript-eslint/no-unused-vars
   78:10  warning  'isSkipped' is assigned a value but never used             @typescript-eslint/no-unused-vars
   78:21  warning  'setIsSkipped' is assigned a value but never used          @typescript-eslint/no-unused-vars
   81:10  warning  'hasUsedOverload' is assigned a value but never used       @typescript-eslint/no-unused-vars
   81:27  warning  'setHasUsedOverload' is assigned a value but never used    @typescript-eslint/no-unused-vars
   82:10  warning  'isOverloadActive' is assigned a value but never used      @typescript-eslint/no-unused-vars
   82:28  warning  'setIsOverloadActive' is assigned a value but never used   @typescript-eslint/no-unused-vars
   83:10  warning  'overloadFlash' is assigned a value but never used         @typescript-eslint/no-unused-vars
   83:25  warning  'setOverloadFlash' is assigned a value but never used      @typescript-eslint/no-unused-vars
   93:24  warning  'setActiveEffect' is assigned a value but never used       @typescript-eslint/no-unused-vars
   94:23  warning  'setActiveCutIn' is assigned a value but never used        @typescript-eslint/no-unused-vars
   98:10  warning  'specialTriggered' is assigned a value but never used      @typescript-eslint/no-unused-vars
   98:28  warning  'setSpecialTriggered' is assigned a value but never used   @typescript-eslint/no-unused-vars
  111:20  warning  'setHookEnemyRobot' is assigned a value but never used     @typescript-eslint/no-unused-vars
  236:9   warning  'showCreditsCapWithXp' is assigned a value but never used  @typescript-eslint/no-unused-vars
  238:9   warning  'isRewardCapped' is assigned a value but never used        @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/pages/BossBattle.tsx
   14:37   warning  'Shield' is defined but never used                                                                      @typescript-eslint/no-unused-vars
   41:11   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   93:25   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  104:8    warning  React Hook useCallback has a missing dependency: 't'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  145:25   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  163:175  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  266:57   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  271:38   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  327:86   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/pages/Collection.tsx
   3:10  warning  'Card' is defined but never used                                                                      @typescript-eslint/no-unused-vars
   7:21  warning  'Loader2' is defined but never used                                                                   @typescript-eslint/no-unused-vars
  15:10  warning  'ScrambleText' is defined but never used                                                              @typescript-eslint/no-unused-vars
  97:6   warning  React Hook useEffect has a missing dependency: 't'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/pages/Dex.tsx
  106:10  warning  'RoleSection' is defined but never used                                                                                                                  @typescript-eslint/no-unused-vars
  309:9   warning  'unlockedSlots' is assigned a value but never used                                                                                                       @typescript-eslint/no-unused-vars
  312:9   warning  'robotMap' is assigned a value but never used                                                                                                            @typescript-eslint/no-unused-vars
  377:9   warning  'statsLine' is assigned a value but never used                                                                                                           @typescript-eslint/no-unused-vars
  397:42  warning  Unexpected any. Specify a different type                                                                                                                 @typescript-eslint/no-explicit-any
  397:55  warning  Unexpected any. Specify a different type                                                                                                                 @typescript-eslint/no-explicit-any
  688:46  error    React Hook "useInWorkshop" cannot be called inside a callback. React Hooks must be called in a React function component or a custom React Hook function  react-hooks/rules-of-hooks
  771:46  error    React Hook "useInWorkshop" cannot be called inside a callback. React Hooks must be called in a React function component or a custom React Hook function  react-hooks/rules-of-hooks

/Users/masahidekojima/barcode-genesis/client/src/pages/Guide.tsx
  2:42  warning  'Skull' is defined but never used  @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/pages/Home.tsx
    1:36  warning  'CSSProperties' is defined but never used           @typescript-eslint/no-unused-vars
    4:10  warning  'Skeleton' is defined but never used                @typescript-eslint/no-unused-vars
   11:19  warning  'Loader2' is defined but never used                 @typescript-eslint/no-unused-vars
   16:8   warning  'LanguageSwitcher' is defined but never used        @typescript-eslint/no-unused-vars
   20:8   warning  'ShareButton' is defined but never used             @typescript-eslint/no-unused-vars
   22:8   warning  'SoundSettings' is defined but never used           @typescript-eslint/no-unused-vars
   26:8   warning  'ThemeSwitcher' is defined but never used           @typescript-eslint/no-unused-vars
   27:10  warning  'Interactive' is defined but never used             @typescript-eslint/no-unused-vars
   58:17  warning  'logout' is assigned a value but never used         @typescript-eslint/no-unused-vars
   60:10  warning  'mode' is assigned a value but never used           @typescript-eslint/no-unused-vars
   61:10  warning  'isGenerating' is assigned a value but never used   @typescript-eslint/no-unused-vars
   62:10  warning  'robot' is assigned a value but never used          @typescript-eslint/no-unused-vars
   65:11  warning  'credits' is assigned a value but never used        @typescript-eslint/no-unused-vars
   65:20  warning  'loginStreak' is assigned a value but never used    @typescript-eslint/no-unused-vars
   65:33  warning  'isPremium' is assigned a value but never used      @typescript-eslint/no-unused-vars
   67:10  warning  'loginError' is assigned a value but never used     @typescript-eslint/no-unused-vars
   72:10  warning  'missionsError' is assigned a value but never used  @typescript-eslint/no-unused-vars
   75:10  warning  'following' is assigned a value but never used      @typescript-eslint/no-unused-vars
   76:10  warning  'followError' is assigned a value but never used    @typescript-eslint/no-unused-vars
   77:10  warning  'isFollowing' is assigned a value but never used    @typescript-eslint/no-unused-vars
  117:21  warning  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  140:21  warning  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  160:21  warning  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  236:9   warning  'handleScan' is assigned a value but never used     @typescript-eslint/no-unused-vars
  249:21  warning  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  300:21  warning  Unexpected any. Specify a different type            @typescript-eslint/no-explicit-any
  316:13  warning  'data' is assigned a value but never used           @typescript-eslint/no-unused-vars
  333:9   warning  'handleFollow' is assigned a value but never used   @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/pages/Leaderboard.tsx
  20:10  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  21:11  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/pages/Premium.tsx
   4:30  warning  'CreditCard' is defined but never used                                                                        @typescript-eslint/no-unused-vars
   4:79  warning  'ChevronDown' is defined but never used                                                                       @typescript-eslint/no-unused-vars
   4:92  warning  'Check' is defined but never used                                                                             @typescript-eslint/no-unused-vars
   6:10  warning  'Card' is defined but never used                                                                              @typescript-eslint/no-unused-vars
   6:16  warning  'CardContent' is defined but never used                                                                       @typescript-eslint/no-unused-vars
   6:29  warning  'CardHeader' is defined but never used                                                                        @typescript-eslint/no-unused-vars
   6:41  warning  'CardTitle' is defined but never used                                                                         @typescript-eslint/no-unused-vars
   6:52  warning  'CardDescription' is defined but never used                                                                   @typescript-eslint/no-unused-vars
  27:32  warning  'userDataLoading' is assigned a value but never used                                                          @typescript-eslint/no-unused-vars
  56:8   warning  React Hook useEffect has a missing dependency: 'isPremium'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/pages/Profile.tsx
  64:6  warning  React Hook useEffect has a missing dependency: 't'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/masahidekojima/barcode-genesis/client/src/pages/RobotDetail.tsx
    5:10  warning  'Card' is defined but never used                                                                                                                                                                                                                       @typescript-eslint/no-unused-vars
    5:16  warning  'CardContent' is defined but never used                                                                                                                                                                                                                @typescript-eslint/no-unused-vars
  194:6   warning  React Hook useEffect has a missing dependency: 't'. Either include it or remove the dependency array                                                                                                                                                   react-hooks/exhaustive-deps
  197:9   warning  'baseSkillIds' is assigned a value but never used                                                                                                                                                                                                      @typescript-eslint/no-unused-vars
  336:28  error    React Hook "useUpgrade" is called in function "handleUpgrade" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use"  react-hooks/rules-of-hooks
  439:18  warning  'nextLevelExp' is assigned a value but never used                                                                                                                                                                                                      @typescript-eslint/no-unused-vars

/Users/masahidekojima/barcode-genesis/client/src/pages/Scan.tsx
    3:21  warning  'Loader2' is defined but never used                  @typescript-eslint/no-unused-vars
   23:23  warning  'ROLE_LABELS' is defined but never used              @typescript-eslint/no-unused-vars
   37:14  warning  'setLocation' is assigned a value but never used     @typescript-eslint/no-unused-vars
   40:12  warning  'isGenerating' is assigned a value but never used    @typescript-eslint/no-unused-vars
   44:12  warning  'scannedBarcode' is assigned a value but never used  @typescript-eslint/no-unused-vars
   45:12  warning  'barcodeKind' is assigned a value but never used     @typescript-eslint/no-unused-vars
   82:29  warning  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
  123:25  warning  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/pages/Shop.tsx
    1:21  warning  'useMemo' is defined but never used                                                                   @typescript-eslint/no-unused-vars
    4:22  warning  'doc' is defined but never used                                                                       @typescript-eslint/no-unused-vars
    4:27  warning  'getDoc' is defined but never used                                                                    @typescript-eslint/no-unused-vars
    5:10  warning  'ArrowLeft' is defined but never used                                                                 @typescript-eslint/no-unused-vars
    5:30  warning  'Zap' is defined but never used                                                                       @typescript-eslint/no-unused-vars
    5:35  warning  'Sword' is defined but never used                                                                     @typescript-eslint/no-unused-vars
    5:42  warning  'Sparkles' is defined but never used                                                                  @typescript-eslint/no-unused-vars
    8:10  warning  'CountUp' is defined but never used                                                                   @typescript-eslint/no-unused-vars
    9:10  warning  'Card' is defined but never used                                                                      @typescript-eslint/no-unused-vars
   13:58  warning  'getItemLabel' is defined but never used                                                              @typescript-eslint/no-unused-vars
   13:72  warning  'getItemDescription' is defined but never used                                                        @typescript-eslint/no-unused-vars
   87:6   warning  React Hook useEffect has a missing dependency: 't'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  151:64  warning  Unexpected any. Specify a different type                                                              @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/pages/Workshop.tsx
   97:8   warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  136:39  warning  Unexpected any. Specify a different type                                                                     @typescript-eslint/no-explicit-any
  174:21  warning  Unexpected any. Specify a different type                                                                     @typescript-eslint/no-explicit-any
  239:8   warning  React Hook useMemo has a missing dependency: 'getRobot'. Either include it or remove the dependency array    react-hooks/exhaustive-deps
  293:21  warning  Unexpected any. Specify a different type                                                                     @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/types/boss.ts
  28:27  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  95:11  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/types/shared.ts
   77:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   78:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  280:31  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  327:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  328:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/masahidekojima/barcode-genesis/client/src/utils/share.ts
  178:25  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  202:14  warning  'error' is defined but never used         @typescript-eslint/no-unused-vars
  249:25  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 308 problems (9 errors, 299 warnings)

```

### 5) npm run typecheck
```
SKIPPED: script "typecheck" not defined in package.json
```

### 6) npm run build
```

> barcode-genesis@1.1.0 build
> node generate-sitemap.js && vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

Sitemap generated at /Users/masahidekojima/barcode-genesis/client/public/sitemap.xml
vite v7.3.0 building client environment for production...
transforming...
✓ 3042 modules transformed.
Generated an empty chunk: "tesseract".
rendering chunks...
computing gzip size...
../dist/public/manifest.webmanifest                            1.12 kB
../dist/public/index.html                                    371.16 kB │ gzip: 106.74 kB
../dist/public/assets/index-B81i-LEJ.css                     240.05 kB │ gzip:  33.22 kB
../dist/public/assets/tesseract-l0sNRNKZ.js                    0.00 kB │ gzip:   0.02 kB
../dist/public/assets/check-D5GN11CI.js                        0.12 kB │ gzip:   0.13 kB
../dist/public/assets/chevron-down-DryuVCyq.js                 0.12 kB │ gzip:   0.14 kB
../dist/public/assets/arrow-left-CZSp9-Gb.js                   0.16 kB │ gzip:   0.16 kB
../dist/public/assets/lock-BHxmD_hH.js                         0.20 kB │ gzip:   0.19 kB
../dist/public/assets/quagga.min-42IJXZXf.js                   0.22 kB │ gzip:   0.20 kB
../dist/public/assets/circle-help-DpB8LYA8.js                  0.23 kB │ gzip:   0.20 kB
../dist/public/assets/heart-BGE9xMiA.js                        0.24 kB │ gzip:   0.21 kB
../dist/public/assets/camera-DXVOOoQu.js                       0.25 kB │ gzip:   0.21 kB
../dist/public/assets/circle-alert-3YNF05FY.js                 0.25 kB │ gzip:   0.18 kB
../dist/public/assets/zap-CCDuKK3t.js                          0.26 kB │ gzip:   0.21 kB
../dist/public/assets/shield-CgKPX1Z0.js                       0.27 kB │ gzip:   0.22 kB
../dist/public/assets/coins-BC5ueQ52.js                        0.28 kB │ gzip:   0.22 kB
../dist/public/assets/factory-BKhZLa3T.js                      0.30 kB │ gzip:   0.21 kB
../dist/public/assets/users-BzmXESu6.js                        0.30 kB │ gzip:   0.23 kB
../dist/public/assets/sword-Bk4LVMsO.js                        0.31 kB │ gzip:   0.21 kB
../dist/public/assets/refresh-cw-BM3fvP_2.js                   0.32 kB │ gzip:   0.23 kB
../dist/public/assets/scan-line-WTJrnckc.js                    0.33 kB │ gzip:   0.21 kB
../dist/public/assets/skull-BT1ielAK.js                        0.34 kB │ gzip:   0.24 kB
../dist/public/assets/scan-barcode-CPbI-KfA.js                 0.40 kB │ gzip:   0.24 kB
../dist/public/assets/trophy-DEam68nc.js                       0.46 kB │ gzip:   0.28 kB
../dist/public/assets/useRobotFx-Cg9TS-6X.js                   0.47 kB │ gzip:   0.30 kB
../dist/public/assets/cpu-Cidm_SXY.js                          0.49 kB │ gzip:   0.26 kB
../dist/public/assets/sparkles-DxTVt6jQ.js                     0.51 kB │ gzip:   0.30 kB
../dist/public/assets/swords-_JkyxOzh.js                       0.55 kB │ gzip:   0.28 kB
../dist/public/assets/interactive-BYu7oioT.js                  0.63 kB │ gzip:   0.40 kB
../dist/public/assets/LazyRender-KCz8vOhE.js                   0.84 kB │ gzip:   0.54 kB
../dist/public/assets/alert-Wl1HfgL-.js                        1.00 kB │ gzip:   0.53 kB
../dist/public/assets/card-CC66bjlC.js                         1.02 kB │ gzip:   0.43 kB
../dist/public/assets/TechCard-D6uZ1-3B.js                     1.20 kB │ gzip:   0.56 kB
../dist/public/assets/badge-CWG7qFiJ.js                        1.27 kB │ gzip:   0.63 kB
../dist/public/assets/firebase-3ouHaiI9.js                     1.56 kB │ gzip:   0.72 kB
../dist/public/assets/tabs-Drjbrz39.js                         1.58 kB │ gzip:   0.65 kB
../dist/public/assets/EmptyState-Cr-rjAtk.js                   1.71 kB │ gzip:   0.77 kB
../dist/public/assets/input-eluf3C98.js                        2.06 kB │ gzip:   0.91 kB
../dist/public/assets/NotFound-s1eBWT6A.js                     2.27 kB │ gzip:   0.89 kB
../dist/public/assets/dexRegistry-B8EIHmIZ.js                  2.28 kB │ gzip:   1.14 kB
../dist/public/assets/Debug-DiL1VK3R.js                        2.51 kB │ gzip:   1.07 kB
../dist/public/assets/AdBanner-qyBHEY8n.js                     3.00 kB │ gzip:   1.39 kB
../dist/public/assets/SEO-CK5C4vqH.js                          3.13 kB │ gzip:   0.91 kB
../dist/public/assets/dialog-BcprVtgW.js                       3.76 kB │ gzip:   1.27 kB
../dist/public/assets/Terms-hVLCH2n-.js                        4.01 kB │ gzip:   1.52 kB
../dist/public/assets/items-CeqxFk7z.js                        4.05 kB │ gzip:   1.51 kB
../dist/public/assets/Privacy-CKTWDNgm.js                      4.43 kB │ gzip:   1.66 kB
../dist/public/assets/select-CBzahvYX.js                       4.78 kB │ gzip:   1.49 kB
../dist/public/assets/GlobalHeader-BVzVQWVE.js                 4.85 kB │ gzip:   1.62 kB
../dist/public/assets/SpecifiedCommercial-BPO3lbzR.js          5.24 kB │ gzip:   1.30 kB
../dist/public/assets/Guide-B_2mRnV5.js                        5.38 kB │ gzip:   1.73 kB
../dist/public/assets/Leaderboard-D99tvNqp.js                  5.55 kB │ gzip:   1.86 kB
../dist/public/assets/workbox-window.prod.es5-BIl4cyR9.js      5.76 kB │ gzip:   2.37 kB
../dist/public/assets/HowTo-3MODwtHI.js                        7.69 kB │ gzip:   1.63 kB
../dist/public/assets/Collection-DK4Uv4tD.js                   7.76 kB │ gzip:   2.71 kB
../dist/public/assets/firebase-functions-DzlYQRKT.js           8.55 kB │ gzip:   3.40 kB
../dist/public/assets/Auth-BM7hk3Rt.js                         9.86 kB │ gzip:   3.11 kB
../dist/public/assets/Shop-DevrDlWC.js                        10.14 kB │ gzip:   3.38 kB
../dist/public/assets/vendor-qkC6yhPU.js                      11.44 kB │ gzip:   4.11 kB
../dist/public/assets/Premium-D2Kb8oPg.js                     13.17 kB │ gzip:   3.81 kB
../dist/public/assets/html-to-image-BDU-53AR.js               13.39 kB │ gzip:   5.32 kB
../dist/public/assets/LandingPage-leTi8twG.js                 14.72 kB │ gzip:   3.73 kB
../dist/public/assets/Achievements-TDu4iy2n.js                15.86 kB │ gzip:   5.01 kB
../dist/public/assets/Profile-2smliOhK.js                     16.58 kB │ gzip:   4.99 kB
../dist/public/assets/BossBattle-CADxyyXM.js                  17.43 kB │ gzip:   4.59 kB
../dist/public/assets/firebase-messaging-B17aX9OX.js          20.32 kB │ gzip:   6.53 kB
../dist/public/assets/Workshop-C3ru-LlB.js                    21.09 kB │ gzip:   5.78 kB
../dist/public/assets/firebase-storage-BJ-ou8iZ.js            22.27 kB │ gzip:   8.10 kB
../dist/public/assets/Dex-BRtrg82o.js                         24.36 kB │ gzip:   6.16 kB
../dist/public/assets/firebase-core-2L1t-Tn6.js               32.95 kB │ gzip:  11.24 kB
../dist/public/assets/Scan-Cdln7NAR.js                        33.09 kB │ gzip:   9.84 kB
../dist/public/assets/ShareCardModal-ybAGwTLI.js              33.13 kB │ gzip:   9.76 kB
../dist/public/assets/RobotDetail-C4VPs_T3.js                 36.35 kB │ gzip:   9.16 kB
../dist/public/assets/RobotSVG-OIqqmegj.js                    41.53 kB │ gzip:   7.98 kB
../dist/public/assets/Battle-Dzd1Gqes.js                      51.45 kB │ gzip:  14.80 kB
../dist/public/assets/BattleReplay-B68VZql9.js                51.62 kB │ gzip:  13.34 kB
../dist/public/assets/Home-BQsgqYC9.js                        56.25 kB │ gzip:  12.63 kB
../dist/public/assets/firebase-auth-D-0AFhnK.js               76.98 kB │ gzip:  22.87 kB
../dist/public/assets/radix-ui-Du3HqZPy.js                    96.19 kB │ gzip:  31.68 kB
../dist/public/assets/framer-motion-D5hDM3q1.js              124.13 kB │ gzip:  41.58 kB
../dist/public/assets/quagga-iMENkS5q.js                     155.96 kB │ gzip:  44.51 kB
../dist/public/assets/firebase-firestore-C8oDM6AQ.js         351.68 kB │ gzip: 107.17 kB
../dist/public/assets/index-BgmhTLbR.js                      355.17 kB │ gzip: 113.34 kB
../dist/public/assets/zxing-DSN73KLr.js                      416.47 kB │ gzip: 110.24 kB
../dist/public/assets/recharts-D-gfnlxA.js                   514.62 kB │ gzip: 134.65 kB
../dist/public/assets/heic2any-CT5v2IVf.js                 1,352.61 kB │ gzip: 341.08 kB

(!) Some chunks are larger than 1000 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 7.69s
error during build:
Error: Unable to write the service worker file. 'Unexpected early exit. This happens when Promises returned by plugins cannot resolve. Unfinished hook action(s) on exit:
(terser) renderChunk
(terser) renderChunk'
    at writeSWUsingDefaultTemplate (/Users/masahidekojima/barcode-genesis/node_modules/workbox-build/build/lib/write-sw-using-default-template.js:68:15)
    at async generateSW (/Users/masahidekojima/barcode-genesis/node_modules/workbox-build/build/generate-sw.js:95:23)
    at async generateServiceWorker (file:///Users/masahidekojima/barcode-genesis/node_modules/vite-plugin-pwa/dist/index.js:208:23)
    at async _generateSW (file:///Users/masahidekojima/barcode-genesis/node_modules/vite-plugin-pwa/dist/index.js:234:5)
    at async Object.handler (file:///Users/masahidekojima/barcode-genesis/node_modules/vite-plugin-pwa/dist/index.js:427:13)
    at async PluginDriver.hookParallel (file:///Users/masahidekojima/barcode-genesis/node_modules/rollup/dist/es/shared/node-entry.js:22426:17)
    at async Object.close (file:///Users/masahidekojima/barcode-genesis/node_modules/rollup/dist/es/shared/node-entry.js:23445:13)
    at async buildEnvironment (file:///Users/masahidekojima/barcode-genesis/node_modules/vite/dist/node/chunks/config.js:33554:15)
    at async Object.build (file:///Users/masahidekojima/barcode-genesis/node_modules/vite/dist/node/chunks/config.js:33899:19)
    at async Object.buildApp (file:///Users/masahidekojima/barcode-genesis/node_modules/vite/dist/node/chunks/config.js:33896:153)
    at async CAC.<anonymous> (file:///Users/masahidekojima/barcode-genesis/node_modules/vite/dist/node/cli.js:629:3)
```

### 7) npm run preview
```

> barcode-genesis@1.1.0 preview
> vite preview --host

error when starting preview server:
Error: listen EPERM: operation not permitted 0.0.0.0:4173
    at Server.setupListenHandle [as _listen2] (node:net:1918:21)
    at listenInCluster (node:net:1997:12)
    at Server.listen (node:net:2102:7)
    at file:///Users/masahidekojima/barcode-genesis/node_modules/vite/dist/node/chunks/config.js:14943:14
    at new Promise (<anonymous>)
    at httpServerStart (file:///Users/masahidekojima/barcode-genesis/node_modules/vite/dist/node/chunks/config.js:14928:9)
    at preview (file:///Users/masahidekojima/barcode-genesis/node_modules/vite/dist/node/chunks/config.js:35143:8)
    at async CAC.<anonymous> (file:///Users/masahidekojima/barcode-genesis/node_modules/vite/dist/node/cli.js:669:18)
```

## Wouter Routes (from client/src/App.tsx)
- /lp -> LandingPage
- /privacy -> Privacy
- /terms -> Terms
- /law -> SpecifiedCommercial
- /auth -> Auth
- /debug -> Debug
- / -> Home (ProtectedRoute + AppShell)
- /dex -> Dex (ProtectedRoute + AppShell)
- /battle -> Battle (ProtectedRoute + AppShell)
- /boss -> BossBattle (ProtectedRoute + AppShell)
- /collection -> Collection (ProtectedRoute + AppShell)
- /shop -> Shop (ProtectedRoute + AppShell)
- /scan -> Scan (ProtectedRoute + AppShell)
- /robots/:robotId -> RobotDetail (ProtectedRoute + AppShell)
- /leaderboard -> Leaderboard (ProtectedRoute + AppShell)
- /achievements -> Achievements (ProtectedRoute + AppShell)
- /premium -> Premium (ProtectedRoute + AppShell)
- /profile -> Profile (ProtectedRoute + AppShell)
- /guide -> Guide (ProtectedRoute + AppShell)
- /how-to -> HowTo (ProtectedRoute + AppShell)
- /workshop -> Workshop
- /404 -> NotFound
- * -> NotFound (fallback)

## Notes
- npm run preview failed due to EPERM binding on 0.0.0.0:4173 in this environment.
