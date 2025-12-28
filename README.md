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
- Emulator ports: Auth 9099, Firestore 8081, Functions 5001, UI 4000.

## Other commands
- `npm run build`
- `npm run start`
- `npm test`
