-- À appliquer une fois sur une base existante, après sauvegarde.
ALTER TABLE orders
 ADD COLUMN checkout_key CHAR(64) NULL UNIQUE,
 ADD COLUMN request_hash CHAR(64) NULL,
 ADD COLUMN order_mode ENUM('REQUEST','PAYMENT') NOT NULL DEFAULT 'PAYMENT',
 ADD COLUMN payment_environment ENUM('sandbox','live','legacy') NOT NULL DEFAULT 'legacy',
 ADD COLUMN reservation_status ENUM('NONE','HELD','RELEASED','CONSUMED') NOT NULL DEFAULT 'HELD',
 ADD COLUMN expires_at DATETIME NULL,
 ADD COLUMN postal_code VARCHAR(20) NOT NULL DEFAULT '',
 ADD COLUMN tax_mode VARCHAR(20) NOT NULL DEFAULT 'UNCONFIRMED',
 ADD COLUMN discount_reserved TINYINT(1) NOT NULL DEFAULT 0;
UPDATE orders SET reservation_status='CONSUMED' WHERE status IN ('PAID','SHIPPED','DELIVERED');
UPDATE orders SET reservation_status='RELEASED' WHERE status='CANCELLED';
UPDATE orders SET discount_reserved=1 WHERE discount_code IS NOT NULL AND status<>'CANCELLED';
-- Les anciennes demandes réservées sont à rapprocher de Stripe avant annulation.
UPDATE orders SET expires_at=DATE_ADD(created_at,INTERVAL 1 HOUR) WHERE status='PENDING';
ALTER TABLE payments
 MODIFY COLUMN status ENUM('PENDING','SUCCESS','FAILED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED') NOT NULL DEFAULT 'PENDING',
 ADD COLUMN attempt_key CHAR(32) NULL UNIQUE,
 ADD COLUMN checkout_expires_at DATETIME NULL,
 ADD COLUMN reconciliation_required TINYINT(1) NOT NULL DEFAULT 0,
 ADD COLUMN refunded_amount INT UNSIGNED NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS payment_events (
 event_id VARCHAR(255) PRIMARY KEY, event_type VARCHAR(100) NOT NULL,
 processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS contact_requests (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 request_key CHAR(64) NOT NULL UNIQUE,
 name VARCHAR(190) NOT NULL, email VARCHAR(190) NOT NULL,
 phone VARCHAR(40) NOT NULL DEFAULT '', company VARCHAR(190) NOT NULL DEFAULT '',
 subject VARCHAR(120) NOT NULL, product VARCHAR(190) NOT NULL DEFAULT '',
 message TEXT NOT NULL,
 status ENUM('NEW','HANDLED') NOT NULL DEFAULT 'NEW',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE delivery_zones ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'MANUAL';
UPDATE delivery_zones SET scope=CASE code WHEN 'france-metropolitaine' THEN 'FR_MAINLAND' WHEN 'corse' THEN 'FR_CORSE' WHEN 'europe' THEN 'EU' WHEN 'retrait-nice' THEN 'PICKUP' ELSE 'MANUAL' END;
