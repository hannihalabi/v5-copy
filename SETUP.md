# PHP Email Setup Instructions

## Files Created

✅ `send-email.php` - Main email handler
✅ `config.php` - Email configuration
✅ `composer.json` - Dependency configuration
✅ `index.html` - Updated to use PHP backend
✅ `index-en.html` - Updated to use PHP backend

## Setup Steps

### 1. Install PHPMailer on one.com Server

You have two options:

#### Option A: Using Composer (Recommended)
If you have SSH access to your one.com server:

```bash
cd /path/to/your/website
composer install
```

#### Option B: Manual Installation
If you don't have Composer access:

1. Download PHPMailer from: https://github.com/PHPMailer/PHPMailer/releases
2. Extract the ZIP file
3. Upload the `src` folder to your server as `vendor/phpmailer/phpmailer/src/`

The directory structure should be:
```
your-website/
├── send-email.php
├── config.php
├── index.html
├── index-en.html
└── vendor/
    └── phpmailer/
        └── phpmailer/
            └── src/
                ├── PHPMailer.php
                ├── SMTP.php
                ├── Exception.php
                └── ... (other files)
```

### 2. Configure Email Password

Edit `config.php` and replace `YOUR_EMAIL_PASSWORD_HERE` with the actual password for `test@creatinghomes.se`:

```php
define('SMTP_PASSWORD', 'your-actual-password');
```

**IMPORTANT:** Keep this file secure and never commit it to public repositories!

### 3. Upload Files to one.com

Upload these files to your one.com web server:
- `send-email.php`
- `config.php`
- `composer.json` (optional)
- `vendor/` folder (with PHPMailer)
- Updated `index.html`
- Updated `index-en.html`

### 4. Set File Permissions

Ensure the following permissions on your server:
- `send-email.php` - 644
- `config.php` - 644 (or 600 for extra security)
- `vendor/` folder - 755

### 5. Test the Form

1. Visit your website
2. Fill out the contact form
3. Submit it
4. Check `test@creatinghomes.se` for the email

## Troubleshooting

### Email not sending?

1. Check `error.log` file on your server for error messages
2. Verify SMTP credentials in `config.php`
3. Ensure PHPMailer is properly installed in `vendor/` folder
4. Check that your one.com email account is active

### File upload issues?

- Ensure `upload_max_filesize` is set appropriately in PHP settings
- Check file permissions on the server

### Still having problems?

Enable debug mode in `send-email.php` by uncommenting this line:
```php
$mail->SMTPDebug = SMTP::DEBUG_SERVER;
```

## Security Notes

- Never commit `config.php` with real passwords to version control
- Consider adding `config.php` to `.gitignore`
- The script validates and sanitizes all inputs
- File uploads are restricted to images only (max 5MB each)

## What Changed from FormSubmit

- ✅ No third-party dependency
- ✅ Full control over email delivery
- ✅ No email activation required
- ✅ Works directly with your one.com email
- ✅ Better error handling and logging
