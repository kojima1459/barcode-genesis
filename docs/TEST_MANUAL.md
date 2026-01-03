# Manual Test (5 min)

## 1) Login -> HOME
- Start: `npm run dev`
- Open: http://localhost:5173
- Login with an existing test account
- Expect: HOME renders, no SYSTEM ERROR, no infinite loading

## 2) /scan
- Navigate to `/scan`
- Expect: scanner UI renders, no crash

## 3) /battle
- Navigate to `/battle`
- Start a battle and wait for result
- Expect: battle replay completes, results shown, no crash

## 4) /premium
- Navigate to `/premium`
- Expect: page renders, no crash
