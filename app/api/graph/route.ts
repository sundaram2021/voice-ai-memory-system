import { NextRequest, NextResponse } from 'next/server';

// Strict Mock Documents matching the GraphApiDocument and GraphApiMemory types
const MOCK_DOCUMENTS = [
  {
    id: 'doc-seed-1',
    title: 'Voice Memory Assistant Activation',
    summary: 'Initial activation of the voice memory graph workspace.',
    documentType: 'text',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    memories: [
      {
        id: 'mem-seed-1a',
        memory: 'System activated voice-to-graph pipeline and set up Web Speech STT transcription.',
        content: 'System activated voice-to-graph pipeline and set up Web Speech STT transcription.',
        isStatic: false,
        spaceId: 'voice-chat',
        isLatest: true,
        isForgotten: false,
        forgetAfter: null,
        forgetReason: null,
        version: 1,
        parentMemoryId: null,
        rootMemoryId: null,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        relation: 'derives' as const,
      },
    ],
  },
  {
    id: 'doc-seed-2',
    title: 'Supermemory Graph Architecture',
    summary: 'Architectural overview of the graph structures in Supermemory.',
    documentType: 'text',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    memories: [
      {
        id: 'mem-seed-2a',
        memory: 'Memory nodes appear as hexagons and document nodes as rectangles on the canvas.',
        content: 'Memory nodes appear as hexagons and document nodes as rectangles on the canvas.',
        isStatic: false,
        spaceId: 'voice-chat',
        isLatest: true,
        isForgotten: false,
        forgetAfter: null,
        forgetReason: null,
        version: 1,
        parentMemoryId: null,
        rootMemoryId: null,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        relation: 'extends' as const,
      },
      {
        id: 'mem-seed-2b',
        memory: 'Relationships are drawn between memories and documents based on content similarity.',
        content: 'Relationships are drawn between memories and documents based on content similarity.',
        isStatic: false,
        spaceId: 'voice-chat',
        isLatest: true,
        isForgotten: false,
        forgetAfter: null,
        forgetReason: null,
        version: 1,
        parentMemoryId: null,
        rootMemoryId: null,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        relation: 'derives' as const,
      },
    ],
  },
  {
    id: 'doc-seed-3',
    title: 'Voice AI Personal Preferences',
    summary: 'Personalization rules for the voice assistant.',
    documentType: 'text',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    memories: [
      {
        id: 'mem-seed-3a',
        memory: 'Claude voice assistant maintains a highly-concise conversational persona optimized for spoken audio.',
        content: 'Claude voice assistant maintains a highly-concise conversational persona optimized for spoken audio.',
        isStatic: false,
        spaceId: 'voice-chat',
        isLatest: true,
        isForgotten: false,
        forgetAfter: null,
        forgetReason: null,
        version: 1,
        parentMemoryId: null,
        rootMemoryId: null,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        relation: 'updates' as const,
      },
    ],
  },
];

// Helper to strictly normalize and map any input document list to the format expected by the Graph canvas library
function mapToGraphDocuments(rawDocs: any[], containerTag: string): any[] {
  return (rawDocs || []).map((doc) => {
    // Map memory items
    const rawMemories = doc.memories || doc.memoryEntries || [];
    const memories = rawMemories.map((mem: any) => ({
      id: mem.id || `mem-${Math.random()}`,
      memory: mem.memory || mem.content || '',
      content: mem.content || mem.memory || '',
      isStatic: mem.isStatic || false,
      spaceId: mem.spaceId || containerTag || 'voice-chat',
      isLatest: mem.isLatest !== undefined ? mem.isLatest : true,
      isForgotten: mem.isForgotten || false,
      forgetAfter: mem.forgetAfter || null,
      forgetReason: mem.forgetReason || null,
      version: mem.version || 1,
      parentMemoryId: mem.parentMemoryId || null,
      rootMemoryId: mem.rootMemoryId || null,
      createdAt: mem.createdAt || new Date().toISOString(),
      updatedAt: mem.updatedAt || new Date().toISOString(),
      relation: mem.relation || null,
    }));

    return {
      id: doc.id,
      title: doc.title || 'Untitled Session',
      summary: doc.summary || doc.title || 'Conversation logs',
      documentType: doc.documentType || doc.type || 'text',
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString(),
      memories,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const containerTag = searchParams.get('containerTag') || 'voice-chat';
    const supermemoryKey = process.env.SUPERMEMORY_API_KEY;

    if (!supermemoryKey) {
      return NextResponse.json({
        documents: mapToGraphDocuments(MOCK_DOCUMENTS, containerTag),
        pagination: { currentPage: 1, totalPages: 1 },
      });
    }

    // Attempt to query the documents endpoints
    let response = await fetch('https://api.supermemory.ai/v3/documents/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supermemoryKey}`,
      },
      body: JSON.stringify({
        page: 1,
        limit: 500,
        sort: 'createdAt',
        order: 'desc',
      }),
    });

    if (!response.ok) {
      console.warn(`Primary endpoint failed with ${response.status}. Trying list endpoint...`);
      response = await fetch('https://api.supermemory.ai/v3/documents/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supermemoryKey}`,
        },
        body: JSON.stringify({
          page: 1,
          limit: 500,
          sort: 'createdAt',
          order: 'desc',
        }),
      });
    }

    if (!response.ok) {
      console.error('Supermemory documents fetch failed:', await response.text());
      return NextResponse.json({
        documents: mapToGraphDocuments(MOCK_DOCUMENTS, containerTag),
        pagination: { currentPage: 1, totalPages: 1 },
      });
    }

    const data = await response.json();
    const rawDocuments = data.documents || [];

    // Fallback to mock documents if none returned yet
    const documents = rawDocuments.length === 0 
      ? mapToGraphDocuments(MOCK_DOCUMENTS, containerTag) 
      : mapToGraphDocuments(rawDocuments, containerTag);

    return NextResponse.json({
      documents,
      pagination: data.pagination || { currentPage: 1, totalPages: 1 },
    });
  } catch (error: any) {
    console.error('Error fetching graph documents:', error);
    return NextResponse.json({
      documents: mapToGraphDocuments(MOCK_DOCUMENTS, 'voice-chat'),
      pagination: { currentPage: 1, totalPages: 1 },
    });
  }
}
