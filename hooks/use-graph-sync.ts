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

  // Function to optimistically inject a user node immediately when user stops speaking
  const addOptimisticUserNode = useCallback((userMessage: string) => {
    const docId = `opt-doc-${Date.now()}`;
    const newDocument: GraphApiDocument = {
      id: docId,
      title: userMessage.length > 25 ? `${userMessage.substring(0, 22)}...` : userMessage,
      summary: `User spoken message: "${userMessage}"`,
      documentType: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memories: [],
    };

    setDocuments((prev) => {
      const filtered = prev.filter((doc) => !doc.id.startsWith('opt-doc-') || (Date.now() - parseInt(doc.id.replace('opt-doc-', '')) < 60000));
      return [newDocument, ...filtered];
    });

    return docId;
  }, []);

  // Function to update the optimistic user node with assistant's live memory response
  const updateOptimisticAiNode = useCallback((docId: string, aiResponse: string) => {
    const memId = `opt-mem-${docId}`;

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;

        const newMemory = {
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
          relation: 'derives' as const,
        };

        return {
          ...doc,
          memories: [newMemory],
        };
      })
    );
  }, [containerTag]);

  // Keep existing method for backwards compatibility
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
      const filtered = prev.filter((doc) => !doc.id.startsWith('opt-doc-') || (Date.now() - parseInt(doc.id.replace('opt-doc-', '')) < 60000));
      return [newDocument, ...filtered];
    });

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
    addOptimisticUserNode,
    updateOptimisticAiNode,
  };
}

