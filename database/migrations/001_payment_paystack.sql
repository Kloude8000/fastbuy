-- Paystack + COD payment support (GHS)
-- Run against fastbuy_db after backup.

ALTER TABLE `orders`
  ADD COLUMN `payment_method` ENUM('cod','paystack') NOT NULL DEFAULT 'cod' AFTER `status`,
  ADD COLUMN `payment_status` ENUM('unpaid','paid','failed') NOT NULL DEFAULT 'unpaid' AFTER `payment_method`,
  ADD COLUMN `paystack_reference` VARCHAR(100) DEFAULT NULL AFTER `payment_status`,
  ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'GHS' AFTER `paystack_reference`;

UPDATE `orders`
SET
  `payment_method` = 'cod',
  `payment_status` = 'unpaid',
  `currency` = 'GHS'
WHERE `payment_method` IS NULL OR `currency` IS NULL;

CREATE TABLE IF NOT EXISTS `pending_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `reference` varchar(100) NOT NULL,
  `amount_ghs` decimal(10,2) NOT NULL,
  `amount_pesewas` int NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'GHS',
  `status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
  `order_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `pending_payments_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pending_payments_order_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
