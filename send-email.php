<?php
/**
 * Contact Form Email Handler
 * Sends form submissions via SMTP using one.com's mail server
 */

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// Set headers for JSON response
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Load configuration
require_once __DIR__ . '/config.php';

// Import PHPMailer classes
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Check if PHPMailer is available
if (!file_exists(__DIR__ . '/vendor/autoload.php')) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server configuration error. Please contact support.'
    ]);
    error_log('PHPMailer not found. Run: composer require phpmailer/phpmailer');
    exit;
}

require __DIR__ . '/vendor/autoload.php';

// Validate and sanitize input
function sanitize_input($data)
{
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

// Validate required fields
$required_fields = [
    'name',
    'email',
    'phone',
    'serviceType',
    'propertyArea',
    'propertyAddress',
    'elevatorAvailability',
    'addonsPreference'
];
$errors = [];

foreach ($required_fields as $field) {
    if (!isset($_POST[$field]) || empty(trim($_POST[$field]))) {
        $errors[] = "Field '$field' is required";
    }
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields', 'errors' => $errors]);
    exit;
}

// Sanitize inputs
$name = sanitize_input($_POST['name']);
$email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
$phone = sanitize_input($_POST['phone']);
$serviceType = sanitize_input($_POST['serviceType']);
$propertyArea = filter_var($_POST['propertyArea'], FILTER_VALIDATE_INT);
$propertyAddress = sanitize_input($_POST['propertyAddress']);
$elevatorAvailability = sanitize_input($_POST['elevatorAvailability']);
$addonsPreference = sanitize_input($_POST['addonsPreference']);
$message = isset($_POST['message']) ? sanitize_input($_POST['message']) : '';

// Validate email
if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

// Create PHPMailer instance
$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host = SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = SMTP_USERNAME;
    $mail->Password = SMTP_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = SMTP_PORT;
    $mail->CharSet = 'UTF-8';

    // Enable verbose debug output (disable in production)
    // $mail->SMTPDebug = SMTP::DEBUG_SERVER;

    // Recipients
    $mail->setFrom(SMTP_USERNAME, 'Creating Homes Website');
    $mail->addAddress(EMAIL_TO);
    $mail->addReplyTo($email, $name);

    // Add CC recipients (supports comma-separated string or array)
    if (defined('EMAIL_CC') && !empty(EMAIL_CC)) {
        $cc_list = is_array(EMAIL_CC) ? EMAIL_CC : explode(',', EMAIL_CC);
        foreach ($cc_list as $cc) {
            $cc = trim($cc);
            if ($cc && filter_var($cc, FILTER_VALIDATE_EMAIL)) {
                $mail->addCC($cc);
            }
        }
    }

    // Handle file attachments
    if (isset($_FILES['projectImages']) && !empty($_FILES['projectImages']['name'])) {
        $allowed_types = ['image/jpeg', 'image/png', 'image/webp'];
        $max_file_size = 5 * 1024 * 1024; // 5MB per file
        $max_files = 5;
        $files = $_FILES['projectImages'];
        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;

        // Normalise to arrays so single uploads and multiple behave the same
        $names = is_array($files['name']) ? $files['name'] : [$files['name']];
        $tmp_names = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
        $sizes = is_array($files['size']) ? $files['size'] : [$files['size']];
        $errors = is_array($files['error']) ? $files['error'] : [$files['error']];

        $attached = 0;
        foreach ($names as $key => $file_name) {
            if ($attached >= $max_files) {
                break;
            }
            if ($errors[$key] !== UPLOAD_ERR_OK || empty($file_name)) {
                continue;
            }

            $file_size = $sizes[$key];
            $tmp_name = $tmp_names[$key];
            if ($file_size > $max_file_size) {
                continue;
            }

            $detected_type = $finfo ? finfo_file($finfo, $tmp_name) : '';
            if (!in_array($detected_type, $allowed_types, true)) {
                continue;
            }

            $safe_name = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file_name));
            if ($safe_name === '') {
                $safe_name = 'attachment';
            }
            $mail->addAttachment($tmp_name, $safe_name);
            $attached += 1;
        }

        if ($finfo) {
            finfo_close($finfo);
        }
    }

    // Content
    $mail->isHTML(true);
    $mail->Subject = EMAIL_SUBJECT;

    // Build email body
    $email_body = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            .field { margin: 15px 0; padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; }
            .label { font-weight: bold; color: #2c3e50; }
            .value { margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <h2>Ny förfrågan från hemsidan</h2>
            
            <div class='field'>
                <div class='label'>Namn:</div>
                <div class='value'>{$name}</div>
            </div>
            
            <div class='field'>
                <div class='label'>E-post:</div>
                <div class='value'>{$email}</div>
            </div>

            <div class='field'>
                <div class='label'>Telefon:</div>
                <div class='value'>{$phone}</div>
            </div>
            
            <div class='field'>
                <div class='label'>Tjänst:</div>
                <div class='value'>{$serviceType}</div>
            </div>
            
            <div class='field'>
                <div class='label'>Kvadratmeter:</div>
                <div class='value'>{$propertyArea} kvm</div>
            </div>
            
            <div class='field'>
                <div class='label'>Adress:</div>
                <div class='value'>{$propertyAddress}</div>
            </div>
            
            <div class='field'>
                <div class='label'>Hiss:</div>
                <div class='value'>{$elevatorAvailability}</div>
            </div>
            
            <div class='field'>
                <div class='label'>Tilläggstjänster:</div>
                <div class='value'>{$addonsPreference}</div>
            </div>
            
            " . (!empty($message) ? "
            <div class='field'>
                <div class='label'>Meddelande:</div>
                <div class='value'>" . nl2br($message) . "</div>
            </div>
            " : "") . "
        </div>
    </body>
    </html>
    ";

    $mail->Body = $email_body;

    // Plain text alternative
    $mail->AltBody = "Ny förfrågan från hemsidan\n\n"
        . "Namn: {$name}\n"
        . "E-post: {$email}\n"
        . "Telefon: {$phone}\n"
        . "Tjänst: {$serviceType}\n"
        . "Kvadratmeter: {$propertyArea} kvm\n"
        . "Adress: {$propertyAddress}\n"
        . "Hiss: {$elevatorAvailability}\n"
        . "Tilläggstjänster: {$addonsPreference}\n"
        . (!empty($message) ? "Meddelande: {$message}\n" : "");

    // Send email
    $mail->send();

    // Success response
    echo json_encode([
        'success' => true,
        'message' => 'Tack! Vi har mottagit din förfrågan och återkommer inom kort.'
    ]);

} catch (Exception $e) {
    error_log("Email send failed: {$mail->ErrorInfo}");
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Oj! Något gick fel. Försök igen eller mejla oss direkt.'
    ]);
}
