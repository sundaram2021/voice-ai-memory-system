import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const anthropicKey = process.env.ANTHROPIC_KEY;
    const supermemoryKey = process.env.SUPERMEMORY_API_KEY;

    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const { message, history, containerTag } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const activeContainerTag = containerTag || 'voice-chat';

    // Format history for Anthropic API
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const messages = [...formattedHistory, { role: 'user', content: message }];

    // Fetch recent conversation history from Supermemory to provide cross-session memory persistence
    let historyContext = "";
    if (supermemoryKey) {
      try {
        console.log(`[Stream] Retrieving history from Supermemory for containerTag: ${activeContainerTag}...`);
        const docResponse = await fetch('https://api.supermemory.ai/v3/documents/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supermemoryKey}`,
          },
          body: JSON.stringify({
            page: 1,
            limit: 50,
            sort: 'createdAt',
            order: 'desc',
          }),
        });

        if (docResponse.ok) {
          const data = await docResponse.json();
          const rawDocs = data.documents || [];
          
          // Filter by active container tag
          const filtered = rawDocs.filter((doc: any) => {
            const tags = doc.containerTags || [];
            return tags.includes(activeContainerTag);
          });

          // Sort chronologically (oldest first)
          const chronologicalDocs = [...filtered].reverse();

          // Format content
          const snippets = chronologicalDocs.map((doc: any) => {
            return doc.content || doc.summary || '';
          }).filter(Boolean);

          if (snippets.length > 0) {
            historyContext = "\n\n=== RECENT MEMORIES & CONVERSATION HISTORY ===\n" + 
              snippets.join('\n\n') + 
              "\n=============================================";
            console.log(`[Stream] Injected ${snippets.length} history snippets into LLM prompt.`);
          }
        } else {
          console.warn('[Stream] Supermemory documents retrieval failed with status:', docResponse.status);
        }
      } catch (err) {
        console.error('[Stream] Error retrieving history from Supermemory:', err);
      }
    }

    const modelsToTry = [
      'claude-sonnet-4-6',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-20250514',
    ];

    let claudeResponse: Response | null = null;
    let selectedModel = '';
    let lastErrorMsg = '';

    for (const model of modelsToTry) {
      try {
        console.log(`[Stream] Attempting chat with Anthropic model: ${model}...`);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 300,
            system: `You are a warm, friendly, and helpful Voice AI Assistant. 
The user is speaking to you directly, and your reply will be read aloud to them.
IMPORTANT RULES:
1. Keep your replies extremely concise, conversational, and natural (1-3 sentences max).
2. Avoid bullet points, code blocks, bold symbols, markdown, or long lists.
3. Speak as if you are in a real phone call or live chat.${historyContext}`,
            messages: messages,
            stream: true,
          }),
        });

        if (response.ok) {
          claudeResponse = response;
          selectedModel = model;
          console.log(`[Stream] Connected to model: ${model}`);
          break;
        } else {
          const errText = await response.text();
          lastErrorMsg = errText;
          console.warn(`[Stream] Model ${model} failed: ${errText}`);
        }
      } catch (err: any) {
        console.error(`[Stream] Exception with ${model}:`, err);
        lastErrorMsg = err.message || String(err);
      }
    }

    if (!claudeResponse || !claudeResponse.body) {
      throw new Error(`Anthropic Stream Error. Last response: ${lastErrorMsg}`);
    }

    // Set up a TransformStream to capture the text delta as it streams to the client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const anthropicReader = claudeResponse.body.getReader();
    let accumulatedText = '';
    let buffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await anthropicReader.read();
            if (done) {
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Process buffer line by line
            const lines = buffer.split('\n');
            // Keep the last partial line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              // Write the raw SSE line back to client
              controller.enqueue(encoder.encode(line + '\n'));

              // Parse content_block_delta to accumulate full text for ingestion
              if (trimmed.startsWith('data:')) {
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') continue;

                try {
                  const dataObj = JSON.parse(dataStr);
                  if (dataObj.type === 'content_block_delta' && dataObj.delta?.text) {
                    accumulatedText += dataObj.delta.text;
                  }
                } catch (e) {
                  // Ignore JSON parsing errors for other message boundaries
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        }
      }
    });

    // Schedule background ingestion to Supermemory after response is complete
    after(() => {
      if (!supermemoryKey) {
        console.log('[Background Ingest] Supermemory key not configured, skipping ingestion.');
        return;
      }
      
      const responseText = accumulatedText.trim();
      if (!responseText) {
        console.warn('[Background Ingest] Empty assistant response, skipping ingestion.');
        return;
      }

      console.log(`[Background Ingest] Starting ingestion for: "${message.slice(0, 30)}..."`);
      
      const conversationSnippet = `User: ${message}\nAssistant: ${responseText}`;
      
      fetch('https://api.supermemory.ai/v3/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supermemoryKey}`,
        },
        body: JSON.stringify({
          content: conversationSnippet,
          containerTag: activeContainerTag,
          metadata: {
            source: 'voice-ai-live',
            timestamp: new Date().toISOString(),
            topic: message.slice(0, 30),
          },
        }),
      })
        .then(async (ingestRes) => {
          if (ingestRes.ok) {
            const data = await ingestRes.json();
            console.log('[Background Ingest] Supermemory ingestion successful. Doc ID:', data.id);
          } else {
            console.error('[Background Ingest] Supermemory ingest failed:', await ingestRes.text());
          }
        })
        .catch((err) => {
          console.error('[Background Ingest] Supermemory network/unknown error:', err);
        });
    });

    // Return the SSE stream to the client
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in streaming chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
