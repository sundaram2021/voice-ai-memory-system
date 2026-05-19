import { NextRequest, NextResponse } from 'next/server';

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
    // Anthropic messages array can only contain role 'user' and 'assistant'
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Add current user message
    const messages = [...formattedHistory, { role: 'user', content: message }];

    // Call Anthropic API using native fetch with model fallbacks
    const modelsToTry = [
      'claude-sonnet-4-6',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-20250514',
    ];

    let claudeResponse: Response | null = null;
    let lastErrorMsg = '';

    for (const model of modelsToTry) {
      try {
        console.log(`Attempting chat with Anthropic model: ${model}...`);
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
3. Speak as if you are in a real phone call or live chat.`,
            messages: messages,
          }),
        });

        if (response.ok) {
          claudeResponse = response;
          console.log(`Successfully completed chat response using model: ${model}`);
          break;
        } else {
          const errText = await response.text();
          lastErrorMsg = errText;
          console.warn(`Model ${model} failed with: ${errText}`);
          if (response.status === 401) {
            throw new Error(`Anthropic Auth Error (401): ${errText}`);
          }
        }
      } catch (err: any) {
        console.error(`Exception while calling model ${model}:`, err);
        lastErrorMsg = err.message || String(err);
      }
    }

    if (!claudeResponse) {
      throw new Error(`Anthropic API Error (all models failed). Last response: ${lastErrorMsg}`);
    }

    const responseData = await claudeResponse.json();
    const replyText = responseData.content?.[0]?.text || '';

    // Ingest the conversation into Supermemory to create a document node
    let supermemorySuccess = false;
    let documentId = '';

    if (supermemoryKey) {
      try {
        const conversationSnippet = `User: ${message}\nAssistant: ${replyText}`;
        const ingestRes = await fetch('https://api.supermemory.ai/v3/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supermemoryKey}`,
          },
          body: JSON.stringify({
            content: conversationSnippet,
            containerTag: activeContainerTag,
            metadata: {
              source: 'voice-ai',
              timestamp: new Date().toISOString(),
              topic: message.slice(0, 30),
            },
          }),
        });

        if (ingestRes.ok) {
          const ingestData = await ingestRes.json();
          documentId = ingestData.id;
          supermemorySuccess = true;
        } else {
          console.error('Supermemory ingest failed:', await ingestRes.text());
        }
      } catch (err) {
        console.error('Error adding to Supermemory:', err);
      }
    }

    return NextResponse.json({
      reply: replyText,
      supermemorySynced: supermemorySuccess,
      documentId: documentId,
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
