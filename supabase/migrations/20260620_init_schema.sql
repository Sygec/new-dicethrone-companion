-- Supabase Migration: Init schema for future cloud synchronization

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Players
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    active INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Heroes
CREATE TABLE IF NOT EXISTS heroes (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    rulepop_url TEXT,
    complexity INT NOT NULL CHECK (complexity BETWEEN 1 AND 6),
    release_set VARCHAR(255) NOT NULL,
    release_wave VARCHAR(255),
    tags TEXT[] NOT NULL DEFAULT '{}',
    owned INT DEFAULT 1,
    active INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Hero Ownership (Custom collections per player)
CREATE TABLE IF NOT EXISTS hero_ownership (
    hero_id VARCHAR(255) REFERENCES heroes(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    PRIMARY KEY (hero_id, player_id)
);

-- 4. Matches
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    played_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    game_mode VARCHAR(50) NOT NULL,
    duration_minutes INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Match Participants
CREATE TABLE IF NOT EXISTS match_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    hero_id VARCHAR(255) REFERENCES heroes(id) ON DELETE CASCADE,
    placement INT,
    UNIQUE(match_id, player_id)
);

-- 6. Recommendations History
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    hero_id VARCHAR(255) REFERENCES heroes(id) ON DELETE CASCADE,
    score INT NOT NULL,
    reasons TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'recommended' CHECK (status IN ('recommended', 'chosen', 'ignored')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL
);
