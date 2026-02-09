"""iCloud Drive integration via WebDAV."""
import logging
from typing import List, Dict, Optional
from pathlib import Path
import hashlib
from webdav3.client import Client
from webdav3.exceptions import WebDavException

logger = logging.getLogger(__name__)


class ICloudService:
    """Service for interacting with iCloud Drive via WebDAV."""
    
    def __init__(self, username: str, app_password: str):
        """
        Initialize iCloud service.
        
        Args:
            username: Apple ID email
            app_password: App-specific password from appleid.apple.com
        """
        self.username = username
        self.app_password = app_password
        
        # WebDAV options for iCloud
        options = {
            'webdav_hostname': "https://p106-caldav.icloud.com",
            'webdav_login': username,
            'webdav_password': app_password,
        }
        
        self.client = Client(options)
    
    def list_files(
        self,
        remote_path: str = "/",
        recursive: bool = False
    ) -> List[str]:
        """
        List files in iCloud directory.
        
        Args:
            remote_path: Path in iCloud Drive
            recursive: List recursively
            
        Returns:
            List of file paths
        """
        try:
            if recursive:
                return self.client.list(remote_path, get_info=False)
            else:
                return self.client.list(remote_path)
        except WebDavException as e:
            logger.error(f"Error listing iCloud files: {e}")
            return []
    
    def download_file(
        self,
        remote_path: str,
        local_path: str
    ) -> bool:
        """
        Download file from iCloud.
        
        Args:
            remote_path: Path in iCloud
            local_path: Local path to save
            
        Returns:
            True if successful
        """
        try:
            self.client.download_sync(
                remote_path=remote_path,
                local_path=local_path
            )
            logger.info(f"Downloaded from iCloud: {remote_path} -> {local_path}")
            return True
        except WebDavException as e:
            logger.error(f"Error downloading from iCloud: {e}")
            return False
    
    def get_info(self, remote_path: str) -> Dict:
        """
        Get file/folder information.
        
        Args:
            remote_path: Path in iCloud
            
        Returns:
            Info dictionary
        """
        try:
            return self.client.info(remote_path)
        except WebDavException as e:
            logger.error(f"Error getting info from iCloud: {e}")
            return {}
    
    def is_directory(self, remote_path: str) -> bool:
        """Check if path is a directory."""
        try:
            return self.client.is_dir(remote_path)
        except WebDavException:
            return False
    
    def list_files_recursively(
        self,
        remote_path: str = "/",
        file_extensions: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Recursively list all files.
        
        Args:
            remote_path: Starting directory
            file_extensions: Filter by extensions
            exclude_patterns: Patterns to exclude
            
        Returns:
            List of file info dictionaries
        """
        all_files = []
        
        try:
            items = self.client.list(remote_path, get_info=True)
            
            for item in items:
                item_path = f"{remote_path}/{item['name']}" if remote_path != "/" else f"/{item['name']}"
                
                # Skip if matches exclude pattern
                if exclude_patterns:
                    skip = False
                    for pattern in exclude_patterns:
                        if pattern in item_path:
                            skip = True
                            break
                    if skip:
                        continue
                
                if item.get('isdir', False):
                    # Recursively process directory
                    subdir_files = self.list_files_recursively(
                        item_path,
                        file_extensions,
                        exclude_patterns
                    )
                    all_files.extend(subdir_files)
                else:
                    # Check file extension
                    if file_extensions:
                        file_ext = Path(item['name']).suffix
                        if file_ext.lower() not in [ext.lower() for ext in file_extensions]:
                            continue
                    
                    all_files.append({
                        'path': item_path,
                        'name': item['name'],
                        'size': item.get('size', 0),
                        'modified': item.get('modified', None),
                    })
        
        except WebDavException as e:
            logger.error(f"Error listing files recursively: {e}")
        
        return all_files
    
    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate MD5 hash of a local file."""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()


class ObsidianSyncService(ICloudService):
    """Specialized service for syncing Obsidian vaults from iCloud."""
    
    DEFAULT_EXCLUDE_FOLDERS = [
        ".obsidian",  # Obsidian config
        ".trash",     # Trash folder
        "templates",  # Usually don't need in knowledge base
    ]
    
    DEFAULT_INCLUDE_EXTENSIONS = [
        ".md",        # Markdown files
        ".pdf",       # PDF attachments
        ".png",       # Images
        ".jpg",
        ".jpeg",
        ".gif",
    ]
    
    def __init__(self, username: str, app_password: str, vault_path: str):
        """
        Initialize Obsidian sync service.
        
        Args:
            username: Apple ID
            app_password: App-specific password
            vault_path: Path to vault in iCloud
        """
        super().__init__(username, app_password)
        self.vault_path = vault_path
    
    def list_vault_notes(
        self,
        include_attachments: bool = True,
        exclude_folders: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        List all notes in Obsidian vault.
        
        Args:
            include_attachments: Include image/PDF attachments
            exclude_folders: Additional folders to exclude
            
        Returns:
            List of note/file info
        """
        exclude = self.DEFAULT_EXCLUDE_FOLDERS.copy()
        if exclude_folders:
            exclude.extend(exclude_folders)
        
        extensions = self.DEFAULT_INCLUDE_EXTENSIONS if include_attachments else [".md"]
        
        return self.list_files_recursively(
            remote_path=self.vault_path,
            file_extensions=extensions,
            exclude_patterns=exclude
        )
    
    def extract_note_metadata(self, note_content: str) -> Dict:
        """
        Extract metadata from Obsidian note (frontmatter, tags, links).
        
        Args:
            note_content: Note markdown content
            
        Returns:
            Metadata dictionary
        """
        import re
        
        metadata = {
            'tags': [],
            'links': [],
            'backlinks': [],
            'frontmatter': {}
        }
        
        # Extract frontmatter (YAML)
        frontmatter_match = re.match(r'^---\n(.*?)\n---', note_content, re.DOTALL)
        if frontmatter_match:
            # Simple YAML parsing (for production use proper YAML parser)
            frontmatter_text = frontmatter_match.group(1)
            for line in frontmatter_text.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata['frontmatter'][key.strip()] = value.strip()
        
        # Extract tags (#tag)
        metadata['tags'] = re.findall(r'#([\  w-]+)', note_content)
        
        # Extract wiki-style links ([[link]])
        metadata['links'] = re.findall(r'\[\[(.*?)\]\]', note_content)
        
        return metadata


def create_icloud_service(username: str, app_password: str) -> ICloudService:
    """Factory function for ICloudService."""
    return ICloudService(username, app_password)


def create_obsidian_service(
    username: str,
    app_password: str,
    vault_path: str
) -> ObsidianSyncService:
    """Factory function for ObsidianSyncService."""
    return ObsidianSyncService(username, app_password, vault_path)
