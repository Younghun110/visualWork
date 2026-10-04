-- Run with a MariaDB account that has CREATE DATABASE privileges.
-- Preserve an existing database and its tables.
CREATE DATABASE IF NOT EXISTS `visualWeb`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'visualWeb';
