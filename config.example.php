<?php
/**
 * Email Configuration Example
 * Copy this file to config.php and fill in your actual credentials
 */

// SMTP Server Settings (one.com)
define('SMTP_HOST', 'mailout.one.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'test@creatinghomes.se');
define('SMTP_PASSWORD', 'YOUR_EMAIL_PASSWORD_HERE'); // Replace with actual password

// Email Recipients
define('EMAIL_TO', 'test@creatinghomes.se');
// Comma-separated list or array of CC recipients
define('EMAIL_CC', 'info@creatinghomes.se,sekreterare@creatinghomes.se');

// Email Subject
define('EMAIL_SUBJECT', 'Ny förfrågan från hemsidan');

// Security: Prevent direct access
if (!defined('SMTP_HOST')) {
    http_response_code(403);
    exit('Access denied');
}
