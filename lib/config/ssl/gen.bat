openssl genrsa -des3 -out miner.key 1024
openssl req -new -key miner.key -out miner.csr
copy miner.key miner.key.org
openssl rsa -in miner.key.org -out miner.key
openssl x509 -req -days 365 -in miner.csr -signkey miner.key -out miner.crt