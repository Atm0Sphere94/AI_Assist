"""Yandex Disk API integration service."""
import logging
import hashlib
from typing import List, Dict, Optional
from datetime import datetime
import httpx
from config import settings

logger = logging.getLogger(__name__)


class YandexDiskService:
    """Service for interacting with Yandex Disk API."""
    
    BASE_URL = "https://cloud-api.yandex.net/v1/disk"
    
    def __init__(self, access_token: str):
        """
        Initialize Yandex Disk service.
        
        Args:
            access_token: OAuth access token for Yandex Disk
        """
        self.access_token = access_token
        self.headers = {
            "Authorization": f"OAuth {access_token}",
            "Content-Type": "application/json"
        }
    
    async def get_disk_info(self) -> Dict:
        """Get disk information (quota, usage, etc.)."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def list_files(
        self,
        path: str = "/",
        limit: int = 100,
        offset: int = 0,
        fields: Optional[str] = None
    ) -> Dict:
        """
        List files in a directory.
        
        Args:
            path: Directory path
            limit: Maximum number of items
            offset: Offset for pagination
            fields: Comma-separated list of fields to return
            
        Returns:
            Dictionary with files list and metadata
        """
        params = {
            "path": path,
            "limit": limit,
            "offset": offset,
        }
        if fields:
            params["fields"] = fields
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/resources",
                headers=self.headers,
                params=params
            )
            response.raise_for_status()
            return response.json()
    
    async def download_file(
        self,
        remote_path: str,
        local_path: str
    ) -> bool:
        """
        Download file from Yandex Disk.
        
        Args:
            remote_path: Path to file on Yandex Disk
            local_path: Local path to save file
            
        Returns:
            True if successful
        """
        try:
            # Get download URL
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(
                    f"{self.BASE_URL}/resources/download",
                    headers=self.headers,
                    params={"path": remote_path}
                )
                response.raise_for_status()
                download_url = response.json()["href"]
                
                # Download file with redirect following
                download_response = await client.get(download_url)
                download_response.raise_for_status()
                
                # Ensure directory exists
                import os
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                
                # Save to local file
                with open(local_path, "wb") as f:
                    f.write(download_response.content)
                
                logger.info(f"Downloaded file: {remote_path} -> {local_path}")
                return True
                
        except Exception as e:
            logger.error(f"Error downloading file {remote_path}: {e}")
            return False
    
    async def get_file_metadata(self, path: str) -> Dict:
        """
        Get file or folder metadata.
        
        Args:
            path: Path to file or folder
            
        Returns:
            Metadata dictionary
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/resources",
                headers=self.headers,
                params={"path": path}
            )
            response.raise_for_status()
            return response.json()
    
    async def list_files_recursively(
        self,
        path: str = "/",
        file_extensions: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
        included_paths: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Recursively list all files in directory and subdirectories.
        
        Args:
            path: Starting directory path
            file_extensions: Filter by file extensions (e.g., ['.pdf', '.docx'])
            exclude_patterns: Patterns to exclude
            included_paths: Only include files within these paths (if set)
            
        Returns:
            List of file metadata dictionaries
        """
        all_files = []
        
        try:
            result = await self.list_files(path)
            
            if "_embedded" not in result:
                return all_files
            
            items = result["_embedded"]["items"]
            
            for item in items:
                # Check if path is within included_paths
                if included_paths:
                    is_included = False
                    for include_path in included_paths:
                        # Check if item path starts with include_path or include_path starts with item path (for partial traversal)
                        if item["path"].replace("disk:", "").startswith(include_path) or include_path.startswith(item["path"].replace("disk:", "")):
                            is_included = True
                            break
                    if not is_included:
                        continue

                # Skip if matches exclude pattern
                if exclude_patterns:
                    skip = False
                    for pattern in exclude_patterns:
                        if pattern in item["path"]:
                            skip = True
                            break
                    if skip:
                        continue
                
                if item["type"] == "dir":
                    # Recursively process directory
                    subdir_files = await self.list_files_recursively(
                        item["path"],
                        file_extensions,
                        exclude_patterns,
                        included_paths
                    )
                    all_files.extend(subdir_files)
                else:
                    # Check file extension
                    if file_extensions:
                        file_ext = "." + item["name"].split(".")[-1] if "." in item["name"] else ""
                        if file_ext.lower() not in [ext.lower() for ext in file_extensions]:
                            continue
                    
                    all_files.append(item)
            
        except Exception as e:
            logger.error(f"Error listing files in {path}: {e}")
        
        return all_files
    
    async def stream_files_recursively(
        self,
        path: str = "/",
        file_extensions: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
        included_paths: Optional[List[str]] = None
    ):
        """
        Stream files recursively using async generator.
        Yields files as they are discovered instead of collecting all first.
        
        Args:
            path: Starting directory path
            file_extensions: Filter by file extensions (e.g., ['.pdf', '.docx'])
            exclude_patterns: Patterns to exclude
            included_paths: Only include files within these paths (if set)
            
        Yields:
            File metadata dictionaries one by one
        """
        try:
            result = await self.list_files(path)
            
            if "_embedded" not in result:
                return
            
            items = result["_embedded"]["items"]
            
            for item in items:
                # Check if path is within included_paths
                if included_paths:
                    is_included = False
                    for include_path in included_paths:
                        if item["path"].replace("disk:", "").startswith(include_path) or include_path.startswith(item["path"].replace("disk:", "")):
                            is_included = True
                            break
                    if not is_included:
                        continue

                # Skip if matches exclude pattern
                if exclude_patterns:
                    skip = False
                    for pattern in exclude_patterns:
                        if pattern in item["path"]:
                            skip = True
                            break
                    if skip:
                        continue
                
                if item["type"] == "dir":
                    # Recursively yield from subdirectory
                    async for file in self.stream_files_recursively(
                        item["path"],
                        file_extensions,
                        exclude_patterns,
                        included_paths
                    ):
                        yield file
                else:
                    # Check file extension
                    if file_extensions:
                        file_ext = "." + item["name"].split(".")[-1] if "." in item["name"] else ""
                        if file_ext.lower() not in [ext.lower() for ext in file_extensions]:
                            continue
                    
                    # Yield file immediately
                    yield item
                    
        except Exception as e:
            logger.error(f"Error scanning directory {path}: {e}")
    
    def calculate_file_hash(self, file_path: str) -> str:
        """
        Calculate MD5 hash of a file.
        
        Args:
            file_path: Path to local file
            
        Returns:
            MD5 hash string
        """
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()


async def create_yandex_disk_service(access_token: str) -> YandexDiskService:
    """
    Factory function to create YandexDiskService instance.
    
    Args:
        access_token: OAuth access token
        
    Returns:
        YandexDiskService instance
    """
    return YandexDiskService(access_token)
