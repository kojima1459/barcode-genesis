# Release Checklist

## 1. Code Quality Baseline

- [x] **Lint Errors**: 0 (Checked via `npm run lint`)
- [x] **CSS Conflicts**: Resolved `font-bold` vs `font-orbitron` by making `.font-orbitron` family-only.
- [x] **Build Status**: Success (Checked via `npm run build`)

## 2. Manual Verification Procedures (Critical Flows)

### 認証 (Auth)

- [ ] **ログイン**: ログインボタン押下 -> Google認証 -> ホーム画面への遷移を確認。
- [ ] **リロード維持**: ホーム画面でブラウザリロード -> ログイン状態が維持され、ユーザー名が表示されること。

### 図鑑 (Dex)

- [ ] **言語統一**: タブ（Collection/Robots/Variants）やフィルター（Role/Rarity）が日本語（または適切な英語ラベル）で表示されること。
- [ ] **Safari翻訳**: 日本語環境で「翻訳しますか？」のポップアップが出ないこと（HTMLのlang属性がjaであることを確認）。

### ショップ (Shop)

- [ ] **日本語化**: 「クレジットポーチ」「クレジットバッグ」等の商品名が日本語で表示されていること。
- [ ] **購入フロー**: 購入ボタン押下 -> エラー（資金不足等）または成功のトーストが表示されること。

### プロフィール (Profile)

- [ ] **アバター変更**: ヘッダー左のアイコンをクリック -> 画像アップロード -> 保存 -> 反映されること。

### プレミアム (Premium)

- [ ] **導線確認**: プレミアム登録ボタン -> Stripe決済画面（またはモック）へ遷移すること。
- [ ] **エラーハンドリング**: ネットワーク切断時などに「SYSTEM ERROR」画面にならず、適切なトーストエラーが出ること。

### 機能 (Features)

- [ ] **週ボス**: ホーム画面から週ボスバナーをクリック -> ボス情報が表示されること。
- [ ] **デイリー**: 「DAILY ORDERS」が表示され、受け取り可能なミッションがある場合CLAIMできること。

## 3. Known Issues (Residual Warnings)

- _List any remaining non-critical warnings here, e.g., unused vars in specific WIP files._
