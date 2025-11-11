import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const {
      conversationContext,
      clientName,
      messageType = 'response',
      tone = 'professional',
      specificInstructions,
    } = await request.json();

    if (!conversationContext || !Array.isArray(conversationContext)) {
      return NextResponse.json(
        { error: 'Conversation context is required and must be an array' },
        { status: 400 }
      );
    }

    // Build the prompt for Claude
    const systemPrompt = `You are an AI assistant helping to draft professional business messages. Generate clear, concise, and ${tone} messages based on the conversation context provided.`;

    const userPrompt = `Based on the following conversation with ${clientName || 'the client'}, please draft a ${tone} ${messageType} message.

Conversation history:
${conversationContext.map((msg: any) => `[${msg.role}]: ${msg.content}`).join('\n\n')}

${specificInstructions ? `\nSpecific instructions: ${specificInstructions}` : ''}

Please draft an appropriate message that:
1. Addresses any questions or concerns raised
2. Maintains a ${tone} tone
3. Is clear and actionable
4. Is concise but complete

Return ONLY the drafted message text, without any preamble or explanation.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const draftedMessage = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return NextResponse.json({
      success: true,
      draftedMessage,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Error drafting message:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to draft message' },
      { status: 500 }
    );
  }
}
