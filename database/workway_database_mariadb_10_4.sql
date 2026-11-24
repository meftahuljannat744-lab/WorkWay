-- WorkWay Database
-- Compatible with XAMPP MariaDB 10.4.32
-- Run this entire file in phpMyAdmin > SQL.
-- This script creates the database and its tables. It does not create sample users or fake jobs.

CREATE DATABASE IF NOT EXISTS workway
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE workway;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. CORE USERS, AUTHENTICATION AND ADMIN PERMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  mobile VARCHAR(30) DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  google_subject VARCHAR(191) DEFAULT NULL,
  role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  account_status ENUM('PENDING','ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'PENDING',
  email_verified_at DATETIME DEFAULT NULL,
  mobile_verified_at DATETIME DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_mobile (mobile),
  UNIQUE KEY uq_users_google_subject (google_subject),
  KEY idx_users_role_status (role, account_status),
  KEY idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  destination VARCHAR(190) NOT NULL,
  purpose ENUM('REGISTER','LOGIN','RESET_PASSWORD','VERIFY_EMAIL','VERIFY_MOBILE','IDENTITY') NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME DEFAULT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_otp_destination_purpose (destination, purpose),
  KEY idx_otp_expiry (expires_at),
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  device_name VARCHAR(150) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_token_hash (token_hash),
  KEY idx_sessions_user_expiry (user_id, expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token (token_hash),
  KEY idx_password_reset_user (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_seeker_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  date_of_birth DATE DEFAULT NULL,
  gender ENUM('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY') DEFAULT NULL,
  profile_photo_path VARCHAR(500) DEFAULT NULL,
  professional_title VARCHAR(180) DEFAULT NULL,
  career_summary TEXT DEFAULT NULL,
  current_location_text VARCHAR(255) DEFAULT NULL,
  expected_salary_min DECIMAL(12,2) DEFAULT NULL,
  expected_salary_max DECIMAL(12,2) DEFAULT NULL,
  availability ENUM('IMMEDIATE','WITHIN_15_DAYS','WITHIN_30_DAYS','WITHIN_60_DAYS','NOT_LOOKING') DEFAULT NULL,
  profile_completion TINYINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS divisions (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_division_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS districts (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  division_id SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_district_division_name (division_id, name),
  CONSTRAINT fk_district_division FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS areas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  district_id SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_area_district_name (district_id, name),
  CONSTRAINT fk_area_district FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  address_type ENUM('CURRENT','PERMANENT') NOT NULL,
  address_line VARCHAR(255) DEFAULT NULL,
  area_id INT UNSIGNED DEFAULT NULL,
  postal_code VARCHAR(20) DEFAULT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_address_type (user_id, address_type),
  KEY idx_user_address_area (area_id),
  CONSTRAINT fk_user_address_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_address_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS educations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  institution VARCHAR(190) NOT NULL,
  degree VARCHAR(150) DEFAULT NULL,
  field_of_study VARCHAR(150) DEFAULT NULL,
  result_text VARCHAR(80) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_education_user (user_id),
  CONSTRAINT fk_education_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS experiences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  organization_name VARCHAR(190) NOT NULL,
  job_title VARCHAR(150) NOT NULL,
  employment_type VARCHAR(80) DEFAULT NULL,
  location_text VARCHAR(190) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_experience_user (user_id),
  CONSTRAINT fk_experience_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT DEFAULT NULL,
  project_url VARCHAR(500) DEFAULT NULL,
  repository_url VARCHAR(500) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_user (user_id),
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skill_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skill_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skills (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED DEFAULT NULL,
  name VARCHAR(120) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skill_normalized_name (normalized_name),
  KEY idx_skill_category (category_id),
  CONSTRAINT fk_skill_category FOREIGN KEY (category_id) REFERENCES skill_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_skills (
  user_id BIGINT UNSIGNED NOT NULL,
  skill_id BIGINT UNSIGNED NOT NULL,
  proficiency ENUM('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT') DEFAULT NULL,
  years_experience DECIMAL(4,1) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skill_id),
  KEY idx_user_skills_skill (skill_id),
  CONSTRAINT fk_user_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS languages (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_language_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_languages (
  user_id BIGINT UNSIGNED NOT NULL,
  language_id SMALLINT UNSIGNED NOT NULL,
  proficiency ENUM('BASIC','CONVERSATIONAL','PROFESSIONAL','FLUENT','NATIVE') DEFAULT NULL,
  PRIMARY KEY (user_id, language_id),
  CONSTRAINT fk_user_languages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_languages_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL,
  issuing_organization VARCHAR(190) DEFAULT NULL,
  issue_date DATE DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  credential_id VARCHAR(150) DEFAULT NULL,
  credential_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_certifications_user (user_id),
  CONSTRAINT fk_certifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  document_type ENUM('CV','NID_FRONT','NID_BACK','CERTIFICATE','OTHER') NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) DEFAULT NULL,
  file_size BIGINT UNSIGNED DEFAULT NULL,
  visibility ENUM('PRIVATE','ADMIN_ONLY') NOT NULL DEFAULT 'PRIVATE',
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_documents_user_type (user_id, document_type),
  CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cv_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  document_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  version_note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cv_user_version (user_id, version_number),
  KEY idx_cv_document (document_id),
  CONSTRAINT fk_cv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cv_document FOREIGN KEY (document_id) REFERENCES user_documents(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cv_analysis (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  cv_version_id BIGINT UNSIGNED DEFAULT NULL,
  analysis_status ENUM('PENDING','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  extracted_text LONGTEXT DEFAULT NULL,
  analysis_result LONGTEXT DEFAULT NULL,
  confidence DECIMAL(5,2) DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cv_analysis_user_status (user_id, analysis_status),
  CONSTRAINT fk_cv_analysis_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cv_analysis_version FOREIGN KEY (cv_version_id) REFERENCES cv_versions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profile_suggestions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  suggestion_text TEXT NOT NULL,
  source_type VARCHAR(60) DEFAULT NULL,
  status ENUM('PENDING','ACCEPTED','DISMISSED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_profile_suggestions_user_status (user_id, status),
  CONSTRAINT fk_profile_suggestions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 2. JOB SOURCES, COLLECTION AND CANONICAL JOBS
-- =========================================================

CREATE TABLE IF NOT EXISTS job_sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_name VARCHAR(190) NOT NULL,
  source_type ENUM('WEBSITE','API','RSS','NEWSPAPER','GOVERNMENT','COMPANY_CAREER_PAGE','MANUAL','OTHER') NOT NULL,
  base_url VARCHAR(500) DEFAULT NULL,
  collection_method ENUM('API','RSS','PERMITTED_SCRAPING','MANUAL','OTHER') NOT NULL DEFAULT 'MANUAL',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  terms_checked_at DATETIME DEFAULT NULL,
  collection_frequency_minutes INT UNSIGNED DEFAULT NULL,
  created_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_job_sources_active (is_active, source_type),
  CONSTRAINT fk_job_source_admin FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_collection_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_id BIGINT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME DEFAULT NULL,
  run_status ENUM('RUNNING','COMPLETED','PARTIAL','FAILED') NOT NULL DEFAULT 'RUNNING',
  records_found INT UNSIGNED NOT NULL DEFAULT 0,
  records_new INT UNSIGNED NOT NULL DEFAULT 0,
  records_updated INT UNSIGNED NOT NULL DEFAULT 0,
  records_duplicate INT UNSIGNED NOT NULL DEFAULT 0,
  records_failed INT UNSIGNED NOT NULL DEFAULT 0,
  error_details LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_collection_source_date (source_id, started_at),
  CONSTRAINT fk_collection_run_source FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS source_job_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_id BIGINT UNSIGNED NOT NULL,
  collection_run_id BIGINT UNSIGNED DEFAULT NULL,
  external_record_id VARCHAR(190) DEFAULT NULL,
  source_url VARCHAR(1000) NOT NULL,
  source_title VARCHAR(500) DEFAULT NULL,
  raw_content LONGTEXT DEFAULT NULL,
  raw_payload LONGTEXT DEFAULT NULL,
  content_hash CHAR(64) DEFAULT NULL,
  processing_status ENUM('NEW','PROCESSED','DUPLICATE','FAILED','IGNORED') NOT NULL DEFAULT 'NEW',
  fetched_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_source_external_record (source_id, external_record_id),
  KEY idx_source_record_hash (content_hash),
  KEY idx_source_record_status (processing_status, fetched_at),
  CONSTRAINT fk_source_record_source FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE RESTRICT,
  CONSTRAINT fk_source_record_run FOREIGN KEY (collection_run_id) REFERENCES job_collection_runs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS source_monitor_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_id BIGINT UNSIGNED NOT NULL,
  checked_at DATETIME NOT NULL,
  response_code SMALLINT UNSIGNED DEFAULT NULL,
  response_time_ms INT UNSIGNED DEFAULT NULL,
  status ENUM('OK','WARNING','FAILED') NOT NULL,
  message TEXT DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_source_monitor_date (source_id, checked_at),
  CONSTRAINT fk_source_monitor_source FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_import_errors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  collection_run_id BIGINT UNSIGNED DEFAULT NULL,
  source_record_id BIGINT UNSIGNED DEFAULT NULL,
  error_code VARCHAR(80) DEFAULT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_import_errors_run (collection_run_id),
  CONSTRAINT fk_import_error_run FOREIGN KEY (collection_run_id) REFERENCES job_collection_runs(id) ON DELETE SET NULL,
  CONSTRAINT fk_import_error_record FOREIGN KEY (source_record_id) REFERENCES source_job_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id INT UNSIGNED DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(170) NOT NULL,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_job_category_slug (slug),
  KEY idx_job_category_parent (parent_id),
  CONSTRAINT fk_job_category_parent FOREIGN KEY (parent_id) REFERENCES job_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employment_types (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employment_type_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_record_id BIGINT UNSIGNED DEFAULT NULL,
  created_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  company_name VARCHAR(190) NOT NULL,
  company_logo_url VARCHAR(1000) DEFAULT NULL,
  company_website VARCHAR(1000) DEFAULT NULL,
  job_title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) DEFAULT NULL,
  description LONGTEXT NOT NULL,
  requirements LONGTEXT DEFAULT NULL,
  responsibilities LONGTEXT DEFAULT NULL,
  benefits LONGTEXT DEFAULT NULL,
  application_url VARCHAR(1000) DEFAULT NULL,
  application_method ENUM('EXTERNAL','INTERNAL','BOTH') NOT NULL DEFAULT 'EXTERNAL',
  vacancies INT UNSIGNED DEFAULT NULL,
  published_at DATETIME DEFAULT NULL,
  deadline_at DATETIME DEFAULT NULL,
  job_status ENUM('DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED','EXPIRED','ARCHIVED') NOT NULL DEFAULT 'PENDING_REVIEW',
  review_note TEXT DEFAULT NULL,
  reviewed_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_jobs_slug (slug),
  KEY idx_jobs_status_deadline (job_status, deadline_at),
  KEY idx_jobs_company (company_name),
  KEY idx_jobs_published (published_at),
  KEY idx_jobs_created_by (created_by_admin_id),
  CONSTRAINT fk_job_source_record FOREIGN KEY (source_record_id) REFERENCES source_job_records(id) ON DELETE SET NULL,
  CONSTRAINT fk_job_creator FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_job_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_source_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  source_record_id BIGINT UNSIGNED DEFAULT NULL,
  source_url VARCHAR(1000) NOT NULL,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_job_source_url (job_id, source_id, source_url(190)),
  KEY idx_job_source_links_source (source_id),
  CONSTRAINT fk_job_source_link_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_source_link_source FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE RESTRICT,
  CONSTRAINT fk_job_source_link_record FOREIGN KEY (source_record_id) REFERENCES source_job_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  area_id INT UNSIGNED DEFAULT NULL,
  location_text VARCHAR(255) DEFAULT NULL,
  work_mode ENUM('ONSITE','REMOTE','HYBRID','FIELD','NOT_SPECIFIED') NOT NULL DEFAULT 'NOT_SPECIFIED',
  PRIMARY KEY (id),
  KEY idx_job_location_job (job_id),
  KEY idx_job_location_area (area_id),
  CONSTRAINT fk_job_location_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_location_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_salary_details (
  job_id BIGINT UNSIGNED NOT NULL,
  salary_min DECIMAL(12,2) DEFAULT NULL,
  salary_max DECIMAL(12,2) DEFAULT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  salary_period ENUM('MONTHLY','YEARLY','HOURLY','PROJECT','NEGOTIABLE','NOT_DISCLOSED') NOT NULL DEFAULT 'NOT_DISCLOSED',
  salary_text VARCHAR(190) DEFAULT NULL,
  PRIMARY KEY (job_id),
  CONSTRAINT fk_job_salary_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_category_map (
  job_id BIGINT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (job_id, category_id),
  KEY idx_job_category_map_category (category_id),
  CONSTRAINT fk_job_category_map_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_category_map_category FOREIGN KEY (category_id) REFERENCES job_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_employment_type_map (
  job_id BIGINT UNSIGNED NOT NULL,
  employment_type_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (job_id, employment_type_id),
  CONSTRAINT fk_job_emp_map_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_emp_map_type FOREIGN KEY (employment_type_id) REFERENCES employment_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_education_requirements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  qualification VARCHAR(190) NOT NULL,
  field_of_study VARCHAR(190) DEFAULT NULL,
  minimum_level VARCHAR(100) DEFAULT NULL,
  is_mandatory TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_job_education_job (job_id),
  CONSTRAINT fk_job_education_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_experience_requirements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  minimum_years DECIMAL(4,1) DEFAULT NULL,
  maximum_years DECIMAL(4,1) DEFAULT NULL,
  experience_text VARCHAR(255) DEFAULT NULL,
  is_fresher_eligible TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_job_experience_job (job_id),
  CONSTRAINT fk_job_experience_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_skills (
  job_id BIGINT UNSIGNED NOT NULL,
  skill_id BIGINT UNSIGNED NOT NULL,
  importance ENUM('REQUIRED','PREFERRED','OPTIONAL') NOT NULL DEFAULT 'REQUIRED',
  PRIMARY KEY (job_id, skill_id),
  KEY idx_job_skills_skill (skill_id),
  CONSTRAINT fk_job_skills_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  changed_by_user_id BIGINT UNSIGNED DEFAULT NULL,
  old_status VARCHAR(40) DEFAULT NULL,
  new_status VARCHAR(40) NOT NULL,
  note TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_job_status_history_job (job_id, created_at),
  CONSTRAINT fk_job_status_history_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_duplicates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  primary_job_id BIGINT UNSIGNED NOT NULL,
  duplicate_job_id BIGINT UNSIGNED NOT NULL,
  similarity_score DECIMAL(5,2) DEFAULT NULL,
  detection_method VARCHAR(80) DEFAULT NULL,
  reviewed_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  resolution ENUM('PENDING','SAME_JOB','DIFFERENT_JOBS','MERGED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_job_duplicate_pair (primary_job_id, duplicate_job_id),
  CONSTRAINT fk_job_duplicate_primary FOREIGN KEY (primary_job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_duplicate_duplicate FOREIGN KEY (duplicate_job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_duplicate_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_review_queue (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  queue_status ENUM('PENDING','IN_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  assigned_admin_id BIGINT UNSIGNED DEFAULT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_job_review_queue_job (job_id),
  KEY idx_job_review_queue_status (queue_status, submitted_at),
  CONSTRAINT fk_job_review_queue_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_review_queue_admin FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_ai_analysis (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  analysis_status ENUM('PENDING','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  category_prediction LONGTEXT DEFAULT NULL,
  extracted_fields LONGTEXT DEFAULT NULL,
  confidence DECIMAL(5,2) DEFAULT NULL,
  model_name VARCHAR(120) DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_job_ai_analysis_job (job_id, created_at),
  CONSTRAINT fk_job_ai_analysis_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS search_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  search_query VARCHAR(500) DEFAULT NULL,
  filters LONGTEXT DEFAULT NULL,
  searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_search_history_user_date (user_id, searched_at),
  CONSTRAINT fk_search_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_searches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  search_name VARCHAR(120) NOT NULL,
  search_query VARCHAR(500) DEFAULT NULL,
  filters LONGTEXT DEFAULT NULL,
  alert_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_saved_search_user (user_id),
  CONSTRAINT fk_saved_search_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 3. JOB MATCHING, SAVED JOBS AND APPLICATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS job_match_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  job_id BIGINT UNSIGNED NOT NULL,
  match_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  education_score DECIMAL(5,2) DEFAULT NULL,
  experience_score DECIMAL(5,2) DEFAULT NULL,
  skills_score DECIMAL(5,2) DEFAULT NULL,
  location_score DECIMAL(5,2) DEFAULT NULL,
  explanation LONGTEXT DEFAULT NULL,
  analysis_status ENUM('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_match_user_job (user_id, job_id),
  KEY idx_match_user_score (user_id, match_percentage),
  KEY idx_match_job (job_id),
  CONSTRAINT fk_match_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_match_skill_details (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  match_result_id BIGINT UNSIGNED NOT NULL,
  skill_id BIGINT UNSIGNED NOT NULL,
  match_status ENUM('MATCHED','MISSING','PARTIAL') NOT NULL,
  user_level VARCHAR(40) DEFAULT NULL,
  required_level VARCHAR(40) DEFAULT NULL,
  explanation VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_match_skill (match_result_id, skill_id),
  CONSTRAINT fk_match_skill_result FOREIGN KEY (match_result_id) REFERENCES job_match_results(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_skill_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  job_id BIGINT UNSIGNED NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_saved_user_job (user_id, job_id),
  KEY idx_saved_jobs_job (job_id),
  CONSTRAINT fk_saved_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_jobs_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  job_id BIGINT UNSIGNED NOT NULL,
  application_type ENUM('INTERNAL','EXTERNAL') NOT NULL,
  status ENUM('SAVED','APPLIED','UNDER_REVIEW','SHORTLISTED','INTERVIEW','OFFERED','REJECTED','WITHDRAWN','UNKNOWN') NOT NULL DEFAULT 'APPLIED',
  cv_document_id BIGINT UNSIGNED DEFAULT NULL,
  cover_letter TEXT DEFAULT NULL,
  external_application_url VARCHAR(1000) DEFAULT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_status_update_at DATETIME DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_application_user_job (user_id, job_id),
  KEY idx_applications_user_status (user_id, status),
  KEY idx_applications_job (job_id),
  CONSTRAINT fk_application_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_cv FOREIGN KEY (cv_document_id) REFERENCES user_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id BIGINT UNSIGNED NOT NULL,
  old_status VARCHAR(40) DEFAULT NULL,
  new_status VARCHAR(40) NOT NULL,
  changed_by_user_id BIGINT UNSIGNED DEFAULT NULL,
  note TEXT DEFAULT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_application_history (application_id, changed_at),
  CONSTRAINT fk_application_history_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id BIGINT UNSIGNED NOT NULL,
  interview_round VARCHAR(100) DEFAULT NULL,
  interview_type ENUM('ONLINE','ONSITE','PHONE','OTHER') NOT NULL DEFAULT 'OTHER',
  scheduled_at DATETIME NOT NULL,
  location_or_link VARCHAR(1000) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  interview_status ENUM('SCHEDULED','COMPLETED','CANCELLED','RESCHEDULED') NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_interviews_application_date (application_id, scheduled_at),
  CONSTRAINT fk_interviews_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_reminders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  reminder_at DATETIME NOT NULL,
  reminder_type ENUM('FOLLOW_UP','INTERVIEW','CUSTOM') NOT NULL DEFAULT 'CUSTOM',
  reminder_status ENUM('PENDING','SENT','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_application_reminder_due (reminder_status, reminder_at),
  CONSTRAINT fk_application_reminder_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_reminder_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_alert_preferences (
  user_id BIGINT UNSIGNED NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  frequency ENUM('INSTANT','DAILY','WEEKLY') NOT NULL DEFAULT 'DAILY',
  minimum_match_percentage DECIMAL(5,2) DEFAULT NULL,
  filters LONGTEXT DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_job_alert_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_alert_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  job_id BIGINT UNSIGNED NOT NULL,
  match_result_id BIGINT UNSIGNED DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  delivery_status ENUM('PENDING','SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (id),
  UNIQUE KEY uq_job_alert_user_job (user_id, job_id),
  KEY idx_job_alert_logs_status (delivery_status, sent_at),
  CONSTRAINT fk_job_alert_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_alert_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_alert_match FOREIGN KEY (match_result_id) REFERENCES job_match_results(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_deadline_reminders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  job_id BIGINT UNSIGNED NOT NULL,
  remind_at DATETIME NOT NULL,
  status ENUM('PENDING','SENT','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_deadline_reminder (user_id, job_id, remind_at),
  KEY idx_deadline_reminder_due (status, remind_at),
  CONSTRAINT fk_deadline_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_deadline_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 4. AI FAKE JOB DETECTION AND USER REPORTS
-- =========================================================

CREATE TABLE IF NOT EXISTS fake_job_warning_signs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT DEFAULT NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fake_warning_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fake_job_analysis (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  analysis_status ENUM('PENDING','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  risk_level ENUM('LOW','MEDIUM','HIGH','CRITICAL','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  risk_score DECIMAL(5,2) DEFAULT NULL,
  confidence DECIMAL(5,2) DEFAULT NULL,
  ai_explanation LONGTEXT DEFAULT NULL,
  model_name VARCHAR(120) DEFAULT NULL,
  admin_decision ENUM('NOT_REVIEWED','SAFE','SUSPICIOUS','FAKE') NOT NULL DEFAULT 'NOT_REVIEWED',
  reviewed_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fake_analysis_job (job_id, created_at),
  KEY idx_fake_analysis_risk (risk_level, admin_decision),
  CONSTRAINT fk_fake_analysis_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_fake_analysis_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fake_job_detected_signs (
  analysis_id BIGINT UNSIGNED NOT NULL,
  warning_sign_id INT UNSIGNED NOT NULL,
  evidence_text TEXT DEFAULT NULL,
  confidence DECIMAL(5,2) DEFAULT NULL,
  PRIMARY KEY (analysis_id, warning_sign_id),
  CONSTRAINT fk_detected_sign_analysis FOREIGN KEY (analysis_id) REFERENCES fake_job_analysis(id) ON DELETE CASCADE,
  CONSTRAINT fk_detected_sign_warning FOREIGN KEY (warning_sign_id) REFERENCES fake_job_warning_signs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fake_job_analysis_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  analysis_id BIGINT UNSIGNED NOT NULL,
  previous_risk_level VARCHAR(20) DEFAULT NULL,
  new_risk_level VARCHAR(20) NOT NULL,
  previous_admin_decision VARCHAR(30) DEFAULT NULL,
  new_admin_decision VARCHAR(30) DEFAULT NULL,
  changed_by_user_id BIGINT UNSIGNED DEFAULT NULL,
  note TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fake_analysis_history (analysis_id, created_at),
  CONSTRAINT fk_fake_history_analysis FOREIGN KEY (analysis_id) REFERENCES fake_job_analysis(id) ON DELETE CASCADE,
  CONSTRAINT fk_fake_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  reported_by_user_id BIGINT UNSIGNED NOT NULL,
  reason_code VARCHAR(80) NOT NULL,
  description TEXT DEFAULT NULL,
  report_status ENUM('PENDING','IN_REVIEW','RESOLVED','DISMISSED') NOT NULL DEFAULT 'PENDING',
  reviewed_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  admin_note TEXT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_job_reports_status (report_status, created_at),
  KEY idx_job_reports_job (job_id),
  CONSTRAINT fk_job_report_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_report_user FOREIGN KEY (reported_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_report_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_evidence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  evidence_url VARCHAR(1000) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_report_evidence_report (report_id),
  CONSTRAINT fk_report_evidence_report FOREIGN KEY (report_id) REFERENCES job_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id BIGINT UNSIGNED NOT NULL,
  changed_by_user_id BIGINT UNSIGNED DEFAULT NULL,
  old_status VARCHAR(30) DEFAULT NULL,
  new_status VARCHAR(30) NOT NULL,
  note TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_report_history (report_id, created_at),
  CONSTRAINT fk_report_history_report FOREIGN KEY (report_id) REFERENCES job_reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 5. CAREERS AND PERSONALIZED LEARNING ROADMAP
-- =========================================================

CREATE TABLE IF NOT EXISTS careers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_career_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS career_required_skills (
  career_id BIGINT UNSIGNED NOT NULL,
  skill_id BIGINT UNSIGNED NOT NULL,
  required_level ENUM('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT') NOT NULL DEFAULT 'BEGINNER',
  importance ENUM('REQUIRED','PREFERRED') NOT NULL DEFAULT 'REQUIRED',
  PRIMARY KEY (career_id, skill_id),
  CONSTRAINT fk_career_skill_career FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE CASCADE,
  CONSTRAINT fk_career_skill_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roadmaps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  career_id BIGINT UNSIGNED NOT NULL,
  cv_analysis_id BIGINT UNSIGNED DEFAULT NULL,
  title VARCHAR(190) NOT NULL,
  roadmap_status ENUM('ACTIVE','COMPLETED','PAUSED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  ai_generation_result LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_roadmaps_user_status (user_id, roadmap_status),
  CONSTRAINT fk_roadmap_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_career FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_roadmap_cv_analysis FOREIGN KEY (cv_analysis_id) REFERENCES cv_analysis(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roadmap_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  roadmap_id BIGINT UNSIGNED NOT NULL,
  unit_number INT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT DEFAULT NULL,
  learning_objectives TEXT DEFAULT NULL,
  unlock_rule ENUM('SEQUENTIAL','CHECKPOINT_PASS','MANUAL') NOT NULL DEFAULT 'CHECKPOINT_PASS',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roadmap_unit_number (roadmap_id, unit_number),
  CONSTRAINT fk_roadmap_unit_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id BIGINT UNSIGNED NOT NULL,
  lesson_order INT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  lesson_content LONGTEXT DEFAULT NULL,
  estimated_minutes SMALLINT UNSIGNED DEFAULT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lesson_order (unit_id, lesson_order),
  CONSTRAINT fk_lesson_unit FOREIGN KEY (unit_id) REFERENCES roadmap_units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_resources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id BIGINT UNSIGNED DEFAULT NULL,
  unit_id BIGINT UNSIGNED DEFAULT NULL,
  resource_type ENUM('ARTICLE','VIDEO','DOCUMENTATION','COURSE','BOOK','OTHER') NOT NULL DEFAULT 'OTHER',
  title VARCHAR(255) NOT NULL,
  resource_url VARCHAR(1000) NOT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_learning_resource_lesson (lesson_id),
  KEY idx_learning_resource_unit (unit_id),
  CONSTRAINT fk_learning_resource_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_resource_unit FOREIGN KEY (unit_id) REFERENCES roadmap_units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS practice_tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  instructions LONGTEXT NOT NULL,
  difficulty ENUM('EASY','MEDIUM','HARD') DEFAULT NULL,
  expected_output TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_practice_tasks_unit (unit_id),
  CONSTRAINT fk_practice_task_unit FOREIGN KEY (unit_id) REFERENCES roadmap_units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quizzes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  passing_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  max_attempts SMALLINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_quizzes_unit (unit_id),
  CONSTRAINT fk_quiz_unit FOREIGN KEY (unit_id) REFERENCES roadmap_units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id BIGINT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','SHORT_TEXT') NOT NULL DEFAULT 'SINGLE_CHOICE',
  points DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  question_order INT UNSIGNED NOT NULL,
  explanation TEXT DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quiz_question_order (quiz_id, question_order),
  CONSTRAINT fk_quiz_question_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id BIGINT UNSIGNED NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  option_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quiz_option_order (question_id, option_order),
  CONSTRAINT fk_quiz_option_question FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkpoint_assessments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  passing_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_checkpoint_unit (unit_id),
  CONSTRAINT fk_checkpoint_unit FOREIGN KEY (unit_id) REFERENCES roadmap_units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkpoint_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  checkpoint_id BIGINT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','SHORT_TEXT') NOT NULL DEFAULT 'SINGLE_CHOICE',
  points DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  question_order INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_checkpoint_question_order (checkpoint_id, question_order),
  CONSTRAINT fk_checkpoint_question_checkpoint FOREIGN KEY (checkpoint_id) REFERENCES checkpoint_assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  lesson_id BIGINT UNSIGNED NOT NULL,
  progress_status ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
  progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  started_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_lesson_progress (user_id, lesson_id),
  CONSTRAINT fk_lesson_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_practice_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  practice_task_id BIGINT UNSIGNED NOT NULL,
  submission_text LONGTEXT DEFAULT NULL,
  submission_url VARCHAR(1000) DEFAULT NULL,
  progress_status ENUM('NOT_STARTED','IN_PROGRESS','SUBMITTED','REVIEWED','COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
  feedback TEXT DEFAULT NULL,
  submitted_at DATETIME DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_practice_task (user_id, practice_task_id),
  CONSTRAINT fk_practice_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_practice_progress_task FOREIGN KEY (practice_task_id) REFERENCES practice_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  attempt_number SMALLINT UNSIGNED NOT NULL,
  score DECIMAL(7,2) DEFAULT NULL,
  total_points DECIMAL(7,2) DEFAULT NULL,
  percentage DECIMAL(5,2) DEFAULT NULL,
  passed TINYINT(1) DEFAULT NULL,
  started_at DATETIME NOT NULL,
  submitted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quiz_attempt_number (quiz_id, user_id, attempt_number),
  KEY idx_quiz_attempt_user (user_id, submitted_at),
  CONSTRAINT fk_quiz_attempt_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  selected_option_ids LONGTEXT DEFAULT NULL,
  answer_text TEXT DEFAULT NULL,
  is_correct TINYINT(1) DEFAULT NULL,
  points_awarded DECIMAL(6,2) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quiz_answer_question (attempt_id, question_id),
  CONSTRAINT fk_quiz_answer_attempt FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_answer_question FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkpoint_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  checkpoint_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  attempt_number SMALLINT UNSIGNED NOT NULL,
  percentage DECIMAL(5,2) DEFAULT NULL,
  passed TINYINT(1) DEFAULT NULL,
  started_at DATETIME NOT NULL,
  submitted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_checkpoint_attempt_number (checkpoint_id, user_id, attempt_number),
  CONSTRAINT fk_checkpoint_attempt_checkpoint FOREIGN KEY (checkpoint_id) REFERENCES checkpoint_assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkpoint_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkpoint_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  answer_text TEXT DEFAULT NULL,
  selected_option_ids LONGTEXT DEFAULT NULL,
  is_correct TINYINT(1) DEFAULT NULL,
  points_awarded DECIMAL(6,2) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_checkpoint_answer_question (attempt_id, question_id),
  CONSTRAINT fk_checkpoint_answer_attempt FOREIGN KEY (attempt_id) REFERENCES checkpoint_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkpoint_answer_question FOREIGN KEY (question_id) REFERENCES checkpoint_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_unit_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  progress_status ENUM('LOCKED','UNLOCKED','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'LOCKED',
  unlocked_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  unlock_reason VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_unit_progress (user_id, unit_id),
  CONSTRAINT fk_unit_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_unit_progress_unit FOREIGN KEY (unit_id) REFERENCES roadmap_units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_learning_recommendations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  roadmap_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED DEFAULT NULL,
  recommendation_type ENUM('EXTRA_LESSON','PRACTICE','RESOURCE','REVIEW','OTHER') NOT NULL,
  recommendation_text LONGTEXT NOT NULL,
  reason TEXT DEFAULT NULL,
  status ENUM('PENDING','VIEWED','COMPLETED','DISMISSED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_learning_user_status (user_id, status),
  CONSTRAINT fk_ai_learning_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_learning_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_learning_unit FOREIGN KEY (unit_id) REFERENCES roadmap_units(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS final_projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  roadmap_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  instructions LONGTEXT NOT NULL,
  evaluation_criteria LONGTEXT DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_final_project_roadmap (roadmap_id),
  CONSTRAINT fk_final_project_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  final_project_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  submission_text LONGTEXT DEFAULT NULL,
  project_url VARCHAR(1000) DEFAULT NULL,
  repository_url VARCHAR(1000) DEFAULT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  submission_status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','ACCEPTED','NEEDS_REVISION') NOT NULL DEFAULT 'DRAFT',
  submitted_at DATETIME DEFAULT NULL,
  feedback TEXT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_project_submission_user (user_id, submission_status),
  CONSTRAINT fk_project_submission_project FOREIGN KEY (final_project_id) REFERENCES final_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_submission_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 6. NOTIFICATIONS AND ANNOUNCEMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS notification_types (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  title VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_type_id SMALLINT UNSIGNED DEFAULT NULL,
  title VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  target_type VARCHAR(80) DEFAULT NULL,
  target_id BIGINT UNSIGNED DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read_date (user_id, is_read, created_at),
  KEY idx_notifications_target (target_type, target_id),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_type FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id BIGINT UNSIGNED NOT NULL,
  email_enabled TINYINT(1) NOT NULL DEFAULT 1,
  push_enabled TINYINT(1) NOT NULL DEFAULT 1,
  job_alerts TINYINT(1) NOT NULL DEFAULT 1,
  deadline_reminders TINYINT(1) NOT NULL DEFAULT 1,
  interview_reminders TINYINT(1) NOT NULL DEFAULT 1,
  learning_reminders TINYINT(1) NOT NULL DEFAULT 1,
  security_alerts TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  notification_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('IN_APP','EMAIL','PUSH','SMS') NOT NULL,
  delivery_status ENUM('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  provider_response TEXT DEFAULT NULL,
  attempted_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notification_delivery (notification_id, channel, delivery_status),
  CONSTRAINT fk_notification_delivery_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  endpoint VARCHAR(1000) NOT NULL,
  p256dh_key VARCHAR(255) NOT NULL,
  auth_key VARCHAR(255) NOT NULL,
  device_label VARCHAR(150) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_endpoint (endpoint(190)),
  KEY idx_push_user_active (user_id, is_active),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  title VARCHAR(190) NOT NULL,
  message LONGTEXT NOT NULL,
  audience ENUM('ALL_USERS','ACTIVE_USERS') NOT NULL DEFAULT 'ALL_USERS',
  publish_at DATETIME DEFAULT NULL,
  expires_at DATETIME DEFAULT NULL,
  announcement_status ENUM('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcement_status_date (announcement_status, publish_at),
  CONSTRAINT fk_announcement_admin FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 7. ADMIN, USER VERIFICATION AND SYSTEM AUDIT
-- =========================================================

CREATE TABLE IF NOT EXISTS admin_permissions (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  permission_code VARCHAR(100) NOT NULL,
  permission_name VARCHAR(150) NOT NULL,
  description TEXT DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_permission_code (permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_user_permissions (
  admin_user_id BIGINT UNSIGNED NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  granted_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_user_id, permission_id),
  CONSTRAINT fk_admin_user_permission_user FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_user_permission_permission FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_permission_granted_by FOREIGN KEY (granted_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  verification_type ENUM('EMAIL','MOBILE','IDENTITY') NOT NULL,
  document_front_id BIGINT UNSIGNED DEFAULT NULL,
  document_back_id BIGINT UNSIGNED DEFAULT NULL,
  verification_status ENUM('PENDING','APPROVED','REJECTED','NEEDS_MORE_INFO') NOT NULL DEFAULT 'PENDING',
  reviewed_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  review_note TEXT DEFAULT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_user_verification_status (verification_status, verification_type),
  KEY idx_user_verification_user (user_id),
  CONSTRAINT fk_user_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_verification_front FOREIGN KEY (document_front_id) REFERENCES user_documents(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_verification_back FOREIGN KEY (document_back_id) REFERENCES user_documents(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_verification_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  changed_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  old_status VARCHAR(30) DEFAULT NULL,
  new_status VARCHAR(30) NOT NULL,
  reason TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_status_history (user_id, created_at),
  CONSTRAINT fk_user_status_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_status_history_admin FOREIGN KEY (changed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action_code VARCHAR(100) NOT NULL,
  target_type VARCHAR(80) DEFAULT NULL,
  target_id BIGINT UNSIGNED DEFAULT NULL,
  description TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_activity_admin_date (admin_user_id, created_at),
  KEY idx_admin_activity_target (target_type, target_id),
  CONSTRAINT fk_admin_activity_user FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(150) NOT NULL,
  setting_value LONGTEXT DEFAULT NULL,
  value_type ENUM('STRING','NUMBER','BOOLEAN','JSON') NOT NULL DEFAULT 'STRING',
  description TEXT DEFAULT NULL,
  updated_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_system_setting_key (setting_key),
  CONSTRAINT fk_system_setting_admin FOREIGN KEY (updated_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_processing_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  job_id BIGINT UNSIGNED DEFAULT NULL,
  task_type VARCHAR(100) NOT NULL,
  input_reference VARCHAR(500) DEFAULT NULL,
  processing_status ENUM('PENDING','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  output_summary LONGTEXT DEFAULT NULL,
  confidence DECIMAL(5,2) DEFAULT NULL,
  processing_time_ms INT UNSIGNED DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_ai_logs_task_status (task_type, processing_status, created_at),
  KEY idx_ai_logs_user (user_id, created_at),
  KEY idx_ai_logs_job (job_id, created_at),
  CONSTRAINT fk_ai_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ai_log_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_error_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  error_level ENUM('INFO','WARNING','ERROR','CRITICAL') NOT NULL DEFAULT 'ERROR',
  error_code VARCHAR(100) DEFAULT NULL,
  message TEXT NOT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  line_number INT UNSIGNED DEFAULT NULL,
  request_path VARCHAR(500) DEFAULT NULL,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_system_error_level_date (error_level, created_at),
  KEY idx_system_error_user (user_id),
  CONSTRAINT fk_system_error_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  request_reason TEXT DEFAULT NULL,
  request_status ENUM('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING',
  reviewed_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_account_deletion_status (request_status, requested_at),
  CONSTRAINT fk_account_deletion_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_account_deletion_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 8. OPTIONAL REFERENCE DATA (SAFE, NON-USER SAMPLE DATA)
-- =========================================================

INSERT IGNORE INTO employment_types (name) VALUES
('Full-time'), ('Part-time'), ('Contract'), ('Internship'), ('Freelance'), ('Temporary');

INSERT IGNORE INTO notification_types (code, title) VALUES
('JOB_ALERT','New job alert'),
('JOB_DEADLINE','Job application deadline'),
('INTERVIEW','Interview reminder'),
('CV_SUGGESTION','CV improvement suggestion'),
('FAKE_JOB_WARNING','Job safety warning'),
('LEARNING_PROGRESS','Learning roadmap progress'),
('LEARNING_REMINDER','Learning reminder'),
('ACCOUNT_VERIFICATION','Account verification update'),
('ADMIN_ANNOUNCEMENT','Admin announcement'),
('APPLICATION_UPDATE','Application status update');

INSERT IGNORE INTO admin_permissions (permission_code, permission_name, description) VALUES
('USER_VIEW','View users','View user accounts and profiles'),
('USER_MANAGE','Manage users','Activate, suspend and manage user accounts'),
('USER_VERIFY','Verify users','Review user identity verification requests'),
('JOB_VIEW','View jobs','View collected job records'),
('JOB_MANAGE','Manage jobs','Create, edit, archive and delete job records'),
('JOB_REVIEW','Review jobs','Approve or reject jobs for publication'),
('SOURCE_MANAGE','Manage sources','Manage job collection sources and monitor collection'),
('REPORT_REVIEW','Review reports','Review user reports about suspicious jobs'),
('LEARNING_MANAGE','Manage learning content','Manage career and roadmap learning content'),
('NOTIFICATION_MANAGE','Manage notifications','Manage announcements and notification settings'),
('SYSTEM_VIEW_LOGS','View system logs','View AI and system processing logs'),
('SYSTEM_MANAGE','Manage system settings','Manage system configuration');

SET FOREIGN_KEY_CHECKS = 1;

-- Quick verification after import:
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE') AS total_tables,
  (SELECT COUNT(*) FROM users) AS users_created,
  (SELECT COUNT(*) FROM jobs) AS jobs_created;

-- IMPORTANT:
-- 1. Only users.role values USER and ADMIN are permitted by this schema.
-- 2. Never store plain-text passwords, OTPs, session tokens or reset tokens.
-- 3. Store private CV/NID files outside the public web root; keep only paths in this database.
-- 4. PHP must enforce ownership and ADMIN permissions on every protected operation.
-- 5. Dashboard figures must be queried from the underlying tables; do not create duplicate dashboard tables.
-- 6. Validate unit unlocking in PHP transactions using lesson completion and passed checkpoint records.
-- 7. External job applicant totals are not available from this database; count only WorkWay applications.
-- 8. Scrape only where permitted by the source's terms and access rules.
