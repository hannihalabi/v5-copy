<?php
/**
 * Email Configuration
 * IMPORTANT: Keep this file secure and do not commit passwords to version control
 */

// SMTP Server Settings (one.com)
define('SMTP_HOST', 'mailout.one.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'test@creatinghomes.se');
define('SMTP_PASSWORD', 'Hemsida123');

// Email Recipients
define('EMAIL_TO', 'test@creatinghomes.se');
define('EMAIL_CC', 'info@creatinghomes.se');

// Email Subject
define('EMAIL_SUBJECT', 'Ny förfrågan från hemsidan');

// Security: Prevent direct access
if (!defined('SMTP_HOST')) {
    http_response_code(403);
    exit('Access denied');
}
