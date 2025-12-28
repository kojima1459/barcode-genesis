# barcode-genesis

## Quickest start
1. `npm install`
2. `npm --prefix functions install`
3. `npm --prefix functions run build`
4. `firebase emulators:start --only auth,firestore,functions`
5. `npm run dev`

Open `http://localhost:3000` in a browser.

## Notes
- Run the emulator and the Vite dev server in separate terminals.
- Firebase Functions target Node 18; use Node 18 if you want to avoid emulator warnings.
- Emulator ports: Auth 9099, Firestore 8082, Functions 5001, UI 4000.

## Week4 (Synthesis/Inheritance) emulator check
1. `firebase emulators:start --only auth,firestore,functions`
2. `VITE_USE_EMULATORS=1 npm run dev`
3. Sign in and scan barcodes to create a base robot and at least 1 material robot.
4. Open Collection → Details on the base robot.
5. Synthesize: select 1-5 materials and run "Synthesize".
6. Inherit: ensure a material has `skills` set (string IDs like `power_smash`).
   - Fast path: edit the material robot in Emulator UI (`http://localhost:4000/firestore`) and set `skills` to `["power_smash"]`.
   - Then select the material + skill and run "Inherit".

## Other commands
- `npm run build`
- `npm run start`
- `npm test`
