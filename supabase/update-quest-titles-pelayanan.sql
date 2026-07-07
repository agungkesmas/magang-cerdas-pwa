UPDATE activities SET title = 'Edukasi & Panduan Layanan JMO', description = 'Asistensi peserta di ruang antrean untuk memakai aplikasi JMO mandiri, dari pengajuan hingga klaim JHT selesai.' WHERE is_quest = true AND title ILIKE '%JMO%' AND title NOT ILIKE '%Edukasi%';

UPDATE activities SET title = 'Pengorganisasian Berkas Klaim JKK', description = 'Penyusunan, pengurutan, dan penataan berkas fisik klaim JKK (kronologi, absensi, identitas, kuitansi medis) untuk memastikan kelengkapan administratif sebelum diproses sistem.' WHERE is_quest = true AND title ILIKE '%Kecelakaan%' AND title NOT ILIKE '%Pengorganisasian%';

UPDATE activities SET title = 'Pengorganisasian Berkas & Validasi JP', description = 'Penataan berkas permohonan JP + validasi status ahli waris (janda/duda, anak, orang tua) antara SMILE dengan portal kependudukan & catatan sipil.' WHERE is_quest = true AND title ILIKE '%Pensiun%' AND title NOT ILIKE '%Pengorganisasian%';

UPDATE activities SET title = 'Pengorganisasian Berkas Penetapan JHT', description = 'Pengelompokan & pengurutan dokumen fisik permohonan JHT untuk mendukung verifikasi data, pencocokan saldo, dan penetapan klaim.' WHERE is_quest = true AND title ILIKE '%JHT%' AND title NOT ILIKE '%Pengorganisasian%' AND title NOT ILIKE '%Edukasi%';

SELECT id, title, LEFT(description, 80) as desc_preview, is_recurring, is_active FROM activities WHERE is_quest = true AND title IN ('Edukasi & Panduan Layanan JMO', 'Pengorganisasian Berkas Klaim JKK', 'Pengorganisasian Berkas & Validasi JP', 'Pengorganisasian Berkas Penetapan JHT') ORDER BY title;

SELECT qdc.completion_date, qdc.xp_awarded, a.title FROM quest_daily_completions qdc JOIN activities a ON a.id = qdc.quest_id WHERE a.title IN ('Edukasi & Panduan Layanan JMO', 'Pengorganisasian Berkas Klaim JKK', 'Pengorganisasian Berkas & Validasi JP', 'Pengorganisasian Berkas Penetapan JHT') ORDER BY qdc.completion_date DESC LIMIT 20;
