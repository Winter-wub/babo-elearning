-- Seed default hero section content keys.
-- Uses ON CONFLICT DO NOTHING so existing values are preserved.

INSERT INTO "SiteContent" ("id", "key", "value", "updatedAt") VALUES
  (gen_random_uuid()::text, 'hero.badge',         'นักเรียนกว่า 500 คนเรียนกับ Gift แล้ว', NOW()),
  (gen_random_uuid()::text, 'hero.headline1',     'อยากเก่งภาษาอังกฤษแต่ไม่รู้จะเริ่มจากไหน?', NOW()),
  (gen_random_uuid()::text, 'hero.headline2',     'เราจะพาคุณไปถึงเป้าหมาย', NOW()),
  (gen_random_uuid()::text, 'hero.body',          'ทดสอบระดับภาษาอังกฤษของคุณฟรี รู้ว่าจุดอ่อนอยู่ที่ไหน แล้วเรียนตามแผนที่ตรงกับคุณ', NOW()),
  (gen_random_uuid()::text, 'hero.ctaLabel',      'เริ่มทดสอบฟรีเลย', NOW()),
  (gen_random_uuid()::text, 'hero.ctaHref',       '/register', NOW()),
  (gen_random_uuid()::text, 'hero.ctaMicro',      'ไม่ต้องเสียค่าใช้จ่าย ทดสอบได้เลย', NOW()),
  (gen_random_uuid()::text, 'hero.cta2Label',     'ดูคอร์สทั้งหมด', NOW()),
  (gen_random_uuid()::text, 'hero.cta2Href',      '/playlists', NOW()),
  (gen_random_uuid()::text, 'hero.stat1.number',  '500+', NOW()),
  (gen_random_uuid()::text, 'hero.stat1.label',   'นักเรียน', NOW()),
  (gen_random_uuid()::text, 'hero.stat2.number',  '4.9', NOW()),
  (gen_random_uuid()::text, 'hero.stat2.label',   'คะแนนเฉลี่ย', NOW()),
  (gen_random_uuid()::text, 'hero.stat3.number',  '10+', NOW()),
  (gen_random_uuid()::text, 'hero.stat3.label',   'แบบทดสอบ', NOW()),
  (gen_random_uuid()::text, 'hero.bgColor',       '#0f172a', NOW())
ON CONFLICT ("key") DO NOTHING;
