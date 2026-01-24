-- Travian Tools Database Initialization

-- Set character encoding
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS travian_tools
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE travian_tools;

-- Grant privileges to application user
-- 開發環境: 授予完整權限以支援自動遷移
-- 使用 '%' 因為 Docker 網路 IP 可能變動，生產環境應限制為特定 IP
GRANT SELECT, INSERT, UPDATE, DELETE ON travian_tools.* TO 'travian'@'%';
-- 開發環境授予 DDL 權限以執行遷移
GRANT CREATE, ALTER, INDEX, DROP ON travian_tools.* TO 'travian'@'%';
FLUSH PRIVILEGES;
