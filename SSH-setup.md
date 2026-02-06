Bash: ssh creatinghomes.se@ssh.creatinghomes.se

Hemsida123


Bash: 
cd /www/

Bash: 
nano config.php


# Rsync upload (allt lokalt laddas upp)
rsync -avz --delete -e "ssh" "./" creatinghomes.se@ssh.creatinghomes.se:/www/


# Run Sitemap-check
python3 scripts/generate-sitemap.py

# Run canonicals-check
python3 scripts/check-canonicals.py

# Run all checks (Det uppdaterar sitemap.xml, kör canonical-check och verifierar robots.txt, llms.txt, .htaccess.)
./scripts/seo-sync.sh

# TESTA E-MAIL 
curl -sS -D - -X POST https://creatinghomes.se/send-email.php \
  -H 'Accept: application/json' \
  -F 'name=Test User' \
  -F 'email=test@example.com' \
  -F 'phone=0700000000' \
  -F 'serviceType=Styling' \
  -F 'propertyArea=25' \
  -F 'propertyAddress=Sollentuna' \
  -F 'elevatorAvailability=Ja' \
  -F 'addonsPreference=Ja'
