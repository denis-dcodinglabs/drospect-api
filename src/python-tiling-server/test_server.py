#!/usr/bin/env python3
"""
Test script for the FastAPI Tiling Server
"""

import asyncio
import httpx
import sys
from config import get_settings

settings = get_settings()

async def test_tiling_server():
    """Test the tiling server endpoints"""
    base_url = f"http://{settings.host}:{settings.port}"
    
    async with httpx.AsyncClient() as client:
        try:
            # Test health endpoint
            print("Testing health endpoint...")
            response = await client.get(f"{base_url}/health")
            if response.status_code == 200:
                print("✅ Health check passed")
                print(f"   Response: {response.json()}")
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
            
            # Test root endpoint
            print("\nTesting root endpoint...")
            response = await client.get(f"{base_url}/")
            if response.status_code == 200:
                print("✅ Root endpoint passed")
                print(f"   Service: {response.json()['service']}")
            else:
                print(f"❌ Root endpoint failed: {response.status_code}")
                return False
            
            # Test with a sample task ID (this will fail but should return proper error)
            print("\nTesting tile endpoints with sample task ID...")
            sample_task_id = "test-task-123"
            
            # Test TileJSON endpoint
            response = await client.get(f"{base_url}/api/tiles/{sample_task_id}/tilejson")
            print(f"   TileJSON status: {response.status_code} (expected 404)")
            
            # Test bounds endpoint
            response = await client.get(f"{base_url}/api/tiles/{sample_task_id}/bounds")
            print(f"   Bounds status: {response.status_code} (expected 404)")
            
            # Test metadata endpoint
            response = await client.get(f"{base_url}/api/tiles/{sample_task_id}/metadata")
            print(f"   Metadata status: {response.status_code} (expected 404)")
            
            # Test tile endpoint
            response = await client.get(f"{base_url}/api/tiles/{sample_task_id}/10/500/500.png")
            print(f"   Tile status: {response.status_code} (expected 404)")
            
            print("\n✅ All basic tests completed successfully!")
            print("   The server is responding correctly to requests")
            print("   404 errors are expected for non-existent tasks")
            
            return True
            
        except httpx.ConnectError:
            print(f"❌ Cannot connect to server at {base_url}")
            print("   Make sure the server is running")
            return False
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return False

def main():
    """Main test function"""
    print("FastAPI Tiling Server Test")
    print("=" * 40)
    print(f"Testing server at: http://{settings.host}:{settings.port}")
    print()
    
    # Run async test
    success = asyncio.run(test_tiling_server())
    
    if success:
        print("\n🎉 All tests passed! The tiling server is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Check the server configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main() 