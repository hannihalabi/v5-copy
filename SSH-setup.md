Bash: ssh creatinghomes.se@ssh.creatinghomes.se

P: Hemsida123


Bash: 
cd /www/

Bash: 
nano config.php


# Rsync upload (allt lokalt laddas upp)
rsync -avz --delete -e "ssh" "./" creatinghomes.se@ssh.creatinghomes.se:/www/


