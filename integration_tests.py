import asyncio
import pytest
import httpx
from rich.console import Console
from pydantic import BaseModel, ValidationError
from pi_supernode.security.access_control import AccessControl
from pi_supernode.data_analytics.data_ingestion import DataIngestion
from pi_supernode.data_analytics.data_processing import DataProcessing

console = Console()

# Konfigurasi URL Base
BASE_URL = "http://localhost:3000"  # Sesuaikan dengan URL server Anda

# Model Validasi Data API
class HealthResponse(BaseModel):
    status: str

class DataResponse(BaseModel):
    data: list

@pytest.mark.asyncio
class TestIntegration:
    """Pengujian integrasi untuk modul internal dan API."""

    async def test_access_control_integration(self):
        """Pengujian integrasi modul AccessControl."""
        console.log("[blue]Testing AccessControl integration...")
        access_control = AccessControl()
        access_control.add_user('user1', ['read', 'write'])
        assert 'user1' in access_control.access_control

    async def test_data_ingestion_integration(self):
        """Pengujian integrasi modul DataIngestion."""
        console.log("[blue]Testing DataIngestion integration...")
        data_ingestion = DataIngestion('topic', ['bootstrap_server'])
        data = data_ingestion.ingest_data()
        assert isinstance(data, pd.DataFrame)

    async def test_data_processing_integration(self):
        """Pengujian integrasi modul DataProcessing."""
        console.log("[blue]Testing DataProcessing integration...")
        data_ingestion = DataIngestion('topic', ['bootstrap_server'])
        data = data_ingestion.ingest_data()
        data_processing = DataProcessing(data)
        processed_data = data_processing.preprocess_data()
        assert isinstance(processed_data, pd.DataFrame)

    async def test_health_check(self):
        """Pengujian endpoint health check."""
        console.log("[green]Testing health check endpoint...")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/health")
            assert response.status_code == 200
            try:
                health = HealthResponse(**response.json())
                assert health.status == "ok"
            except ValidationError as e:
                pytest.fail(f"Health endpoint response invalid: {e}")

    async def test_data_endpoint(self):
        """Pengujian endpoint data retrieval."""
        console.log("[green]Testing data retrieval endpoint...")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/data")
            assert response.status_code == 200
            try:
                data_response = DataResponse(**response.json())
                assert isinstance(data_response.data, list)
            except ValidationError as e:
                pytest.fail(f"Data endpoint response invalid: {e}")

    async def test_post_data(self):
        """Pengujian endpoint pengiriman data."""
        console.log("[green]Testing post data endpoint...")
        payload = {'key': 'value'}
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{BASE_URL}/data", json=payload)
            assert response.status_code == 201
            assert response.json().get('message') == 'Data created successfully.'

    async def test_invalid_endpoint(self):
        """Pengujian endpoint tidak valid."""
        console.log("[red]Testing invalid endpoint...")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/invalid")
            assert response.status_code == 404

if __name__ == "__main__":
    console.log("[bold magenta]Running advanced integration tests with pytest...[/bold magenta]")
    pytest.main(["-v", __file__])
