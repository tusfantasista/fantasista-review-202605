INSERT OR IGNORE INTO import_batches (
  id, file_name, imported_by, environment, row_count, inserted_count, updated_count, error_count, status, completed_at
) VALUES (
  'batch_preview_seed_001',
  'dummy-members-preview.csv',
  'seed',
  'preview',
  5,
  5,
  0,
  0,
  'completed',
  datetime('now')
);

INSERT OR IGNORE INTO members (
  id, member_code, full_name, full_name_kana, maiden_name, email, phone,
  graduation_year, generation, school_lineage, dance_role, source_batch_id
) VALUES
  ('mem_preview_001', 'TUS-1988-001', '山田 太郎', 'やまだ たろう', NULL, 'taro.yamada@example.test', '090-0000-0001', 1988, '22期', '東京理科大学', 'リーダー', 'batch_preview_seed_001'),
  ('mem_preview_002', 'TUS-1996-001', '佐藤 花子', 'さとう はなこ', '鈴木', 'hanako.sato@example.test', '090-0000-0002', 1996, '30期', '東京理科大学', 'パートナー', 'batch_preview_seed_001'),
  ('mem_preview_003', 'TUS-2003-001', '田中 一郎', 'たなか いちろう', NULL, 'ichiro.tanaka@example.test', '090-0000-0003', 2003, '37期', '東京理科大学', 'リーダー', 'batch_preview_seed_001'),
  ('mem_preview_004', 'TUS-2006-001', '高橋 美咲', 'たかはし みさき', NULL, 'misaki.takahashi@example.test', '090-0000-0004', 2006, '40期', '東京理科大学', 'パートナー', 'batch_preview_seed_001'),
  ('mem_preview_005', 'TUS-2018-001', '中村 翔', 'なかむら しょう', NULL, 'sho.nakamura@example.test', '090-0000-0005', 2018, '52期', '東京理科大学', 'リーダー', 'batch_preview_seed_001');
