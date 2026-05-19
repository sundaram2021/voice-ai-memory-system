'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GraphApiDocument } from '@supermemory/memory-graph';

export function useGraphSync(containerTag: string = 'voice-chat') {
  const [documents, setDocuments] = useState<GraphApiDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGraph = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/graph?containerTag=${containerTag}`);
      if (!res.ok) {
        throw new Error('Failed to fetch graph documents');
      }
      const data = await res.json();
      
      setDocuments(data.documents || []);
      setError(null);
    } catch (err: any) {
      console.error('Error syncing graph:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [containerTag]);

  // Initial load
  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Function to optimistically inject a node into the graph state for zero-latency updates
  const addOptimisticNode = useCallback((userMessage: string, aiResponse: string) => {
    const docId = `opt-doc-${Date.now()}`;
    const memId = `opt-mem-${Date.now()}`;

    const newDocument: GraphApiDocument = {
      id: docId,
      title: userMessage.length > 25 ? `${userMessage.substring(0, 22)}...` : userMessage,
      summary: `Conversational exchange regarding: ${userMessage}`,
      documentType: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memories: [
        {
          id: memId,
          memory: aiResponse,
          content: aiResponse,
          isStatic: false,
          spaceId: containerTag,
          isLatest: true,
          isForgotten: false,
          forgetAfter: null,
          forgetReason: null,
          version: 1,
          parentMemoryId: null,
          rootMemoryId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          relation: 'derives',
        },
      ],
    };

    setDocuments((prev) => {
      // Remove any temporary optimistic nodes that might have matched (unlikely with timestamps)
      const filtered = prev.filter((doc) => !doc.id.startsWith('opt-doc-') || (Date.now() - parseInt(doc.id.replace('opt-doc-', '')) < 60000));
      return [newDocument, ...filtered];
    });

    // Automatically trigger a server poll in the background after 6 seconds to fetch the actual processed nodes
    setTimeout(() => {
      fetchGraph();
    }, 6000);
  }, [containerTag, fetchGraph]);

  return {
    documents,
    isLoading,
    error,
    refetch: fetchGraph,
    addOptimisticNode,
  };
}
