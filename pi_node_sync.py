import requests
import time
import os
import logging

# Konfigurasi logging
logging.basicConfig(
    filename="pi_node_sync.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# API endpoint untuk mendapatkan informasi blok
NODE_API = "http://localhost:5000/status"  # Ganti dengan API node lokal
NETWORK_API = "https://pi-network-blockchain.com/latest-block"  # API blockchain global

# Konfigurasi retry
MAX_RETRIES = 5
INITIAL_DELAY = 2  # Dalam detik

def fetch_data_with_retry(url, retries=MAX_RETRIES, delay=INITIAL_DELAY):
    """Mengambil data dengan retry otomatis menggunakan backoff exponential."""
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logging.warning(f"Percobaan {attempt + 1}: Gagal mengambil data dari {url}. Error: {e}")
            time.sleep(delay * (2 ** attempt))  # Exponential backoff

    logging.error(f"Gagal mendapatkan data setelah {retries} percobaan ❌")
    return None

def get_local_block_height():
    """Mengambil tinggi blok lokal dari node."""
    data = fetch_data_with_retry(NODE_API)
    if data:
        return data.get("block_height", 0)
    return 0

def get_network_block_height():
    """Mengambil tinggi blok terbaru dari jaringan blockchain."""
    data = fetch_data_with_retry(NETWORK_API)
    if data:
        return data.get("block_height", 0)
    return 0

def auto_sync_node():
    """Otomatis sinkronisasi jika node tertinggal lebih dari 10 blok."""
    local_height = get_local_block_height()
    network_height = get_network_block_height()

    if local_height == 0 or network_height == 0:
        logging.warning("Tidak bisa mendapatkan data blok. Pastikan koneksi berjalan.")
        return

    if local_height >= network_height:
        logging.info("Node sudah sinkron ✅")
        return

    block_lag = network_height - local_height
    logging.warning(f"Node tertinggal {block_lag} blok! (Local: {local_height}, Network: {network_height}) ❌")

    if block_lag > 10:  # Jika tertinggal lebih dari 10 blok
        logging.info("Memulai sinkronisasi node...")
        sync_command = "pi-node sync --force"  # Ganti dengan perintah sinkronisasi yang sesuai
        result = os.system(sync_command)

        if result == 0:
            logging.info("Sinkronisasi berhasil ✅")
        else:
            logging.error("Sinkronisasi gagal ❌")

if __name__ == "__main__":
    logging.info("Memulai monitoring sinkronisasi Pi-Node...")

    while True:
        auto_sync_node()
        time.sleep(30)  # Cek setiap 30 detik
