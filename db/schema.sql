-- ============================================================================
--  動画サイトのデータベース（Cloudflare D1 / SQLite）
--
--  ・videos       … 動画そのものと、公開状態・並び順
--  ・video_views  … 再生されるたびに1行増える生ログ
--  ・集計は video_daily_stats（ビュー）から取る
--
--  生ログを残しているので、あとから「曜日別」「端末別」「離脱率」など
--  今は考えていない切り口でも集計できる。
-- ============================================================================

CREATE TABLE IF NOT EXISTS videos (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  duration_sec    REAL NOT NULL DEFAULT 0,

  -- 配信先ごとの識別子。窓口（source.ts）がこれを見て再生URLを組み立てる
  r2_key          TEXT NOT NULL,
  thumb_key       TEXT,
  vimeo_id        TEXT,
  mux_playback_id TEXT,

  -- YouTube と同じ3段階
  --   public   … トップページに出る
  --   unlisted … URLを知っている人だけ見られる（一覧には出ない）
  --   private  … 管理者だけ
  visibility      TEXT NOT NULL DEFAULT 'private'
                  CHECK (visibility IN ('public', 'unlisted', 'private')),

  -- 並び順。小さいほど先に出る
  position        INTEGER NOT NULL DEFAULT 0,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_videos_visibility_position
  ON videos (visibility, position);
CREATE INDEX IF NOT EXISTS idx_videos_position
  ON videos (position);

-- ---------------------------------------------------------------------------
--  視聴ログ。再生が始まるたびに1行。
--  個人を特定する情報は持たない（session_id はランダムな文字列）。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_views (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id        TEXT NOT NULL,
  viewed_at       TEXT NOT NULL DEFAULT (datetime('now')),
  day             TEXT NOT NULL,          -- YYYY-MM-DD（集計を速くするため）
  hour            INTEGER NOT NULL,       -- 0-23（時間帯の分析用）
  session_id      TEXT,                   -- 同じ人の重複を除くための目印
  seconds_watched INTEGER NOT NULL DEFAULT 0,
  completed       INTEGER NOT NULL DEFAULT 0,  -- 最後まで見たら1
  device          TEXT,                   -- mobile / tablet / desktop
  country         TEXT,                   -- Cloudflare が付けてくれる国コード
  referrer        TEXT
);

CREATE INDEX IF NOT EXISTS idx_views_video_day ON video_views (video_id, day);
CREATE INDEX IF NOT EXISTS idx_views_day       ON video_views (day);
CREATE INDEX IF NOT EXISTS idx_views_session   ON video_views (session_id);

-- ---------------------------------------------------------------------------
--  日別の集計。管理画面のグラフはここから読む。
-- ---------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS video_daily_stats AS
SELECT
  video_id,
  day,
  COUNT(*)                         AS views,
  COUNT(DISTINCT session_id)       AS unique_viewers,
  SUM(seconds_watched)             AS total_seconds,
  SUM(completed)                   AS completions
FROM video_views
GROUP BY video_id, day;

-- ---------------------------------------------------------------------------
--  動画ごとの通算。一覧に出す数字はここから。
-- ---------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS video_totals AS
SELECT
  v.id                                   AS video_id,
  COALESCE(COUNT(w.id), 0)               AS views,
  COALESCE(COUNT(DISTINCT w.session_id), 0) AS unique_viewers,
  COALESCE(SUM(w.seconds_watched), 0)    AS total_seconds,
  COALESCE(SUM(w.completed), 0)          AS completions,
  MAX(w.viewed_at)                       AS last_viewed_at
FROM videos v
LEFT JOIN video_views w ON w.video_id = v.id
GROUP BY v.id;
