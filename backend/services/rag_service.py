"""RAG (Retrieval Augmented Generation) service for document indexing and retrieval."""
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

from db.models import Document
from config import settings

logger = logging.getLogger(__name__)


class RAGService:
    """Service for RAG operations - indexing and retrieving documents."""
    
    def __init__(self, db: AsyncSession):
        """Initialize RAG service."""
        self.db = db
        self.qdrant_client = QdrantClient(
            url=settings.qdrant_url,
            timeout=30
        )
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=settings.openai_api_key
        ) if settings.openai_api_key else None
        
        self.collection_name = "documents"
        self._ensure_collection()
    
    def _ensure_collection(self):
        """Ensure Qdrant collection exists."""
        try:
            collections = self.qdrant_client.get_collections()
            collection_names = [c.name for c in collections.collections]
            
            if self.collection_name not in collection_names:
                # Create collection with OpenAI embedding dimensions (1536)
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
                )
                logger.info(f"Created Qdrant collection: {self.collection_name}")
        except Exception as e:
            logger.warning(f"Could not ensure collection: {e}")
    
    async def index_document(
        self,
        document_id: int,
        preserve_markdown: bool = False,
        process_wiki_links: bool = False
    ) -> bool:
        """
        Index a document in the vector database.
        
        Args:
            document_id: Document ID to index
            preserve_markdown: Keep markdown formatting
            process_wiki_links: Process wiki-style links
            
        Returns:
            True if successful
        """
        try:
            # Get document
            document = await self.db.get(Document, document_id)
            if not document:
                logger.error(f"Document not found: {document_id}")
                return False
            
            # Skip if no embeddings available
            if not self.embeddings:
                logger.warning("No embeddings model configured, skipping indexing")
                return False
            
            # Read document content
            try:
                with open(document.file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                logger.error(f"Error reading document {document_id}: {e}")
                return False
            
            # Split into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            chunks = text_splitter.split_text(content)
            
            if not chunks:
                logger.warning(f"No chunks created for document {document_id}")
                return False
            
            # Generate embeddings
            embeddings = self.embeddings.embed_documents(chunks)
            
            # Index in Qdrant
            points = []
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                point = PointStruct(
                    id=f"{document_id}_{idx}",
                    vector=embedding,
                    payload={
                        "document_id": document_id,
                        "chunk_index": idx,
                        "text": chunk,
                        "filename": document.original_filename,
                        "user_id": document.user_id,
                        "file_type": document.file_type
                    }
                )
                points.append(point)
            
            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            
            logger.info(f"Indexed document {document_id}: {len(chunks)} chunks")
            return True
            
        except Exception as e:
            logger.error(f"Error indexing document {document_id}: {e}", exc_info=True)
            return False
    
    async def search(
        self,
        query: str,
        user_id: int,
        limit: int = 5
    ) -> List[dict]:
        """
        Search for relevant document chunks.
        
        Args:
            query: Search query
            user_id: User ID to filter by
            limit: Number of results
            
        Returns:
            List of search results with text and metadata
        """
        try:
            if not self.embeddings:
                logger.warning("No embeddings model configured")
                return []
            
            # Generate query embedding
            query_embedding = self.embeddings.embed_query(query)
            
            # Search in Qdrant
            search_results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                query_filter={
                    "must": [
                        {"key": "user_id", "match": {"value": user_id}}
                    ]
                },
                limit=limit
            )
            
            # Format results
            results = []
            for result in search_results:
                results.append({
                    "text": result.payload.get("text", ""),
                    "score": result.score,
                    "document_id": result.payload.get("document_id"),
                    "filename": result.payload.get("filename", ""),
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching: {e}", exc_info=True)
            return []
