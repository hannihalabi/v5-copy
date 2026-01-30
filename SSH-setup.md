Bash: ssh creatinghomes.se@ssh.creatinghomes.se

P: Hemsida123


Bash: 
cd /www/

Bash: 
nano config.php


# Cron: auto-update /artiklar/ from Google Docs

1) Upload `scripts/update-blog.sh` to the server (same path as the website).
2) SSH in and run:

chmod +x /www/scripts/update-blog.sh

3) Add a cron job:

crontab -e

Example (every 1 minute):
* * * * * /www/scripts/update-blog.sh >/tmp/creatinghomes-blog.log 2>&1

Note: If Node is not found in cron, set NODE_BIN inside `scripts/update-blog.sh` to the full path from `which node`.
Note: `scripts/update-blog.sh` runs with CLEAN_ORPHANS=true, so removed Docs will be deleted from `/artiklar/`.
