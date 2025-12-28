# barcode-genesis

## Quickest start
1. `npm install`
2. `npm --prefix functions install`
3. `npm --prefix functions run build`
4. `firebase emulators:start --only auth,firestore,functions`
5. `npm run dev`

Open `http://localhost:5173` in a browser.

## Notes
- Run the emulator and the Vite dev server in separate terminals.
- Firebase Functions target Node 18; use Node 18 if you want to avoid emulator warnings.
- Emulator ports: Auth 9099, Firestore 8084, Functions 5001, UI 4000.

## Week4 (Synthesis/Inheritance) emulator check
1. `firebase emulators:start --only auth,firestore,functions`
2. `VITE_USE_EMULATORS=1 npm run dev`
3. Sign in and scan barcodes to create a base robot and at least 1 material robot.
4. Open Collection → Details on the base robot.
5. Synthesize: select 1-5 materials and run "Synthesize".
6. Inherit: ensure a material has `skills` set (string IDs like `power_smash`).
   - Fast path: edit the material robot in Emulator UI (`http://localhost:4000/firestore`) and set `skills` to `["power_smash"]`.
   - Then select the material + skill and run "Inherit".

## Week5 (Credits/Shop/Equip) emulator check
1. `firebase emulators:start --only auth,firestore,functions`
2. `VITE_USE_EMULATORS=1 npm run dev`
3. Sign in and scan at least one barcode (creates `/users/{uid}` with `credits: 0`).
4. In Emulator UI (`http://localhost:4000/firestore`), set `/users/{uid}.credits` to a test value (ex: 500).
5. Open Shop → purchase items → confirm credits/inventory change.
6. Open Collection → Details on a robot → equip items in slot1/slot2 → unequip and confirm inventory returns.

## Week6 (Daily missions / Login bonus / Follow) emulator check
1. `firebase emulators:start --only auth,firestore,functions`
2. `VITE_USE_EMULATORS=1 npm run dev`
3. Login bonus: open Home → "Claim bonus" once; second click should fail with `failed-precondition`.
4. Streak test: set `/users/{uid}.lastLoginDateKey` to yesterday (JST) in Emulator UI, then claim again to see streak +1.
5. Daily missions: call "Daily Missions" to create `/users/{uid}/missions/{dateKey}`.
   - In Emulator UI, edit a mission's `progress` to match `target`, then claim from Home.
6. Follow: enter a target UID in Home → Follow, confirm `publicUsers/{uid}/following/{targetUid}`.
7. grantBattleRewards is not implemented yet; it needs a server-side battle record source to avoid client spoofing.

## Other commands
- `npm run build`
- `npm run start`
- `npm test`
