-- Phase 1: 데이터베이스 및 테이블 생성 스크립트
-- 실행 방법: psql -U postgres -f setup_database.sql

-- 1. 데이터베이스 생성 (이미 있으면 에러 무시)
CREATE DATABASE five_minute_brief;

-- 2. 데이터베이스 선택
\c five_minute_brief

-- 3. Users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- 5. 확인 메시지
SELECT '✅ 데이터베이스 및 테이블 생성 완료!' AS status;
SELECT '테이블 목록:' AS info;
\dt

-- 6. 테이블 구조 확인
SELECT 'Users 테이블 구조:' AS info;
\d users
