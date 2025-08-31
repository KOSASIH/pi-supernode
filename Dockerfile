# Dockerfile
FROM stellar/stellar-core:latest
COPY config/stellar-core.cfg /etc/stellar/stellar-core.cfg
COPY config/horizon.yaml /etc/horizon/horizon.yaml
COPY config/genesis.json /etc/stellar/genesis.json
COPY config/network.js /etc/stellar/network.js
COPY src/ /app/src/
RUN apt-get update && apt-get install -y redis-server postgresql-client
EXPOSE 11625 8000
CMD ["stellar-core", "--conf", "/etc/stellar/stellar-core.cfg"]
