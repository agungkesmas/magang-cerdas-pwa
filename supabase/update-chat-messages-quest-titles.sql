UPDATE chat_messages SET content = REPLACE(content, '"Membantu Klaim JHT via JMO"', '"Edukasi & Panduan Layanan JMO"') WHERE content LIKE '%Membantu Klaim JHT via JMO%' AND content NOT LIKE '%Edukasi & Panduan Layanan JMO%';

UPDATE chat_messages SET content = REPLACE(content, '"Verifikasi Pengajuan Jaminan Kecelakaan Kerja"', '"Pengorganisasian Berkas Klaim JKK"') WHERE content LIKE '%Verifikasi Pengajuan Jaminan Kecelakaan Kerja%' AND content NOT LIKE '%Pengorganisasian Berkas Klaim JKK%';

UPDATE chat_messages SET content = REPLACE(content, '"Verifikasi Pengajuan Jaminan Pensiun"', '"Pengorganisasian Berkas & Validasi JP"') WHERE content LIKE '%Verifikasi Pengajuan Jaminan Pensiun%' AND content NOT LIKE '%Pengorganisasian Berkas & Validasi JP%';

UPDATE chat_messages SET content = REPLACE(content, '"Penetapan JHT"', '"Pengorganisasian Berkas Penetapan JHT"') WHERE content LIKE '%"Penetapan JHT"%' AND content NOT LIKE '%Pengorganisasian Berkas Penetapan JHT%';

UPDATE nudges SET message = REPLACE(message, '"Membantu Klaim JHT via JMO"', '"Edukasi & Panduan Layanan JMO"') WHERE message LIKE '%Membantu Klaim JHT via JMO%' AND message NOT LIKE '%Edukasi & Panduan Layanan JMO%';

UPDATE nudges SET message = REPLACE(message, '"Verifikasi Pengajuan Jaminan Kecelakaan Kerja"', '"Pengorganisasian Berkas Klaim JKK"') WHERE message LIKE '%Verifikasi Pengajuan Jaminan Kecelakaan Kerja%' AND message NOT LIKE '%Pengorganisasian Berkas Klaim JKK%';

UPDATE nudges SET message = REPLACE(message, '"Verifikasi Pengajuan Jaminan Pensiun"', '"Pengorganisasian Berkas & Validasi JP"') WHERE message LIKE '%Verifikasi Pengajuan Jaminan Pensiun%' AND message NOT LIKE '%Pengorganisasian Berkas & Validasi JP%';

UPDATE nudges SET message = REPLACE(message, '"Penetapan JHT"', '"Pengorganisasian Berkas Penetapan JHT"') WHERE message LIKE '%"Penetapan JHT"%' AND message NOT LIKE '%Pengorganisasian Berkas Penetapan JHT%';

SELECT id, LEFT(content, 120) as content_preview, created_at FROM chat_messages WHERE content LIKE '%Pengorganisasian%' OR content LIKE '%Edukasi & Panduan%' ORDER BY created_at DESC LIMIT 15;

SELECT id, LEFT(message, 120) as message_preview, created_at FROM nudges WHERE message LIKE '%Pengorganisasian%' OR message LIKE '%Edukasi & Panduan%' ORDER BY created_at DESC LIMIT 10;
