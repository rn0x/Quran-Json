-- Database Schema
-- Updated for Hafs 114-surah timing data and verse-by-verse audio.

-- Total tables: 7

-- Table: surahs
-- Columns: 9
CREATE TABLE surahs (
    number INTEGER,
    name_ar TEXT,
    name_en TEXT,
    name_transliteration TEXT,
    revelation_place_ar TEXT,
    revelation_place_en TEXT,
    verses_count INTEGER,
    words_count INTEGER,
    letters_count INTEGER
);

-- Table: verses
-- Columns: 7
CREATE TABLE verses (
    surah_number INTEGER,
    number INTEGER,
    text_ar TEXT,
    text_en TEXT,
    juz INTEGER,
    page INTEGER,
    sajda BOOLEAN
);

-- Table: audio
-- Columns: 8
CREATE TABLE audio (
    id INTEGER,
    surah_number INTEGER,
    reciter_ar TEXT,
    reciter_en TEXT,
    rewaya_ar TEXT,
    rewaya_en TEXT,
    server TEXT,
    link TEXT
);

-- Table: timing_reciters
-- Columns: 6
CREATE TABLE timing_reciters (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    rewaya TEXT,
    folder_url TEXT,
    soar_count INTEGER,
    soar_link TEXT
);

-- Table: ayat_timing
-- Columns: 6
CREATE TABLE ayat_timing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reciter_id INTEGER NOT NULL,
    surah_number INTEGER NOT NULL,
    verse_number INTEGER NOT NULL,
    start_time_ms INTEGER NOT NULL,
    end_time_ms INTEGER NOT NULL,
    FOREIGN KEY (reciter_id) REFERENCES timing_reciters (id),
    FOREIGN KEY (surah_number) REFERENCES surahs (number),
    UNIQUE(reciter_id, surah_number, verse_number)
);

-- Table: ayat_timing_geometry
-- Columns: 6
CREATE TABLE ayat_timing_geometry (
    surah_number INTEGER NOT NULL,
    verse_number INTEGER NOT NULL,
    polygon TEXT,
    x REAL,
    y REAL,
    page_number INTEGER,
    PRIMARY KEY (surah_number, verse_number)
);

CREATE INDEX idx_timing_reciter_id ON ayat_timing(reciter_id);
CREATE INDEX idx_timing_surah ON ayat_timing(surah_number);
CREATE INDEX idx_timing_verse ON ayat_timing(verse_number);
CREATE INDEX idx_timing_reciter_surah ON ayat_timing(reciter_id, surah_number);

-- Table: ayah_audio_reciters
-- Columns: 7
CREATE TABLE ayah_audio_reciters (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    rewaya TEXT,
    musshaf_type TEXT,
    audio_url_bit_rate_32 TEXT,
    audio_url_bit_rate_64 TEXT,
    audio_url_bit_rate_128 TEXT
);

-- Table: api_reference
-- Columns: 11
CREATE TABLE api_reference (
    id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    version TEXT,
    base_url TEXT,
    documentation_url TEXT,
    github_url TEXT,
    json_content TEXT NOT NULL,
    statistics TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
