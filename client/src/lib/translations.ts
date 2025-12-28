export type Language = 'ja' | 'en';

export const translations = {
  ja: {
    // Common
    app_title: "バーコードジェネシス",
    back: "戻る",
    loading: "読み込み中...",
    error: "エラーが発生しました",
    success: "成功しました",
    
    // Menu
    scan_barcode: "バーコードスキャン",
    scan_desc: "バーコードからロボットを生成",
    collection: "コレクション",
    collection_desc: "獲得したロボット一覧",
    battle: "バトル",
    battle_desc: "ロボットを使って対戦",
    leaderboard: "ランキング",
    leaderboard_desc: "トッププレイヤーを確認",
    
    // Scan
    back_to_menu: "メニューに戻る",
    analyzing: "バーコードDNAを解析中...",
    constructing: "ロボットフレームを構築中...",
    scan_success: "ロボット生成成功！",
    scan_failed: "ロボット生成に失敗しました",
    
    // Robot Stats
    hp: "HP",
    attack: "攻撃力",
    defense: "防御力",
    speed: "素早さ",
    level: "Lv.",
    save_return: "保存して戻る",
    
    // Battle
    battle_arena: "バトルアリーナ",
    select_robot: "ロボット選択",
    your_id: "あなたのID",
    select_opponent: "対戦相手を選択",
    friend_id_placeholder: "フレンドのユーザーID",
    search: "検索",
    no_opponents: "対戦相手が見つかりません",
    start_battle: "バトル開始",
    play_again: "もう一度戦う",
    win: "勝利！",
    lose: "敗北...",
    exp_gained: "獲得経験値",
    level_up: "レベルアップ！ステータス上昇！",
    new_skill: "新スキル習得",
    skill_upgraded: "スキル強化",
    turn: "ターン",
    critical: "クリティカル！",
    
    // Collection
    my_robots: "マイロボット",
    total: "合計",
    sort_newest: "新しい順",
    sort_rarity: "レアリティ順",
    sort_level: "レベル順",
    
    // Leaderboard
    top_players: "トッププレイヤー",
    rank: "順位",
    player: "プレイヤー",
    wins: "勝利数",
    
    // Auth
    login_title: "バーコードジェネシスへようこそ",
    login_desc: "Googleアカウントでログインして冒険を始めよう",
    login_google: "Googleでログイン",
    
    // Skills
    skill_power_smash: "パワースマッシュ",
    skill_double_strike: "ダブルストライク",
    skill_laser_beam: "レーザービーム",
    skill_iron_wall: "鉄壁",
    skill_evasion: "回避",
    skill_repair: "修理",
    skill_charge: "チャージ",
    skill_jamming: "ジャミング",
  },
  en: {
    // Common
    app_title: "Barcode Genesis",
    back: "Back",
    loading: "Loading...",
    error: "An error occurred",
    success: "Success",
    
    // Menu
    scan_barcode: "Scan Barcode",
    scan_desc: "Generate a new robot from any barcode",
    collection: "Collection",
    collection_desc: "View your robot army",
    battle: "Battle",
    battle_desc: "Fight with your robots!",
    leaderboard: "Leaderboard",
    leaderboard_desc: "Check top players",
    
    // Scan
    back_to_menu: "Back to Menu",
    analyzing: "Analyzing barcode DNA...",
    constructing: "Constructing robot frame...",
    scan_success: "Robot generated successfully!",
    scan_failed: "Failed to generate robot",
    
    // Robot Stats
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    speed: "Speed",
    level: "Lv.",
    save_return: "Save & Return",
    
    // Battle
    battle_arena: "Battle Arena",
    select_robot: "Select Your Robot",
    your_id: "Your ID",
    select_opponent: "Select Opponent",
    friend_id_placeholder: "Friend's User ID",
    search: "Search",
    no_opponents: "No opponents found",
    start_battle: "Start Battle",
    play_again: "Play Again",
    win: "YOU WIN!",
    lose: "YOU LOSE...",
    exp_gained: "EXP Gained",
    level_up: "LEVEL UP! Stats Increased!",
    new_skill: "New Skill Learned",
    skill_upgraded: "Skill Upgraded",
    turn: "Turn",
    critical: "CRITICAL!",
    
    // Collection
    my_robots: "My Robots",
    total: "Total",
    sort_newest: "Newest",
    sort_rarity: "Rarity",
    sort_level: "Level",
    
    // Leaderboard
    top_players: "Top Players",
    rank: "Rank",
    player: "Player",
    wins: "Wins",
    
    // Auth
    login_title: "Welcome to Barcode Genesis",
    login_desc: "Sign in with Google to start your adventure",
    login_google: "Sign in with Google",
    
    // Skills
    skill_power_smash: "Power Smash",
    skill_double_strike: "Double Strike",
    skill_laser_beam: "Laser Beam",
    skill_iron_wall: "Iron Wall",
    skill_evasion: "Evasion",
    skill_repair: "Repair",
    skill_charge: "Charge",
    skill_jamming: "Jamming",
  }
};
