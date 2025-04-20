
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, scenario, character = '', concise = false } = await req.json();

    // Retrieve the OpenRouter API key from environment variables
    const openRouterKey = Deno.env.get('OpenRouter');
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not found');
    }

    // Add system message based on scenario
    let systemMessage = "";
    let model = "openai/gpt-3.5-turbo";

    if (scenario === 'therapist') {
      systemMessage = `You are Dr. Maya, a compassionate AI therapist. Your responses should be helpful, empathetic, and concise. 
      Focus on listening, validating feelings, and providing practical coping mechanisms.
      Keep your responses brief (2-3 sentences max) and avoid overly clinical language.
      DO NOT write long paragraphs. Be conversational but professional.`;
      model = "openai/gpt-3.5-turbo";
    } 
    else if (scenario === 'boyfriend-level-1') {
      systemMessage = `You are playing the role of an insecure, controlling boyfriend in a text message conversation simulation.
      You should display classic red flags like jealousy, possessiveness, and emotional manipulation.
      Keep responses brief (1-2 short sentences), realistic, and conversational.
      DON'T be physically threatening, but be emotionally manipulative. 
      The user is practicing setting boundaries with you. If they firmly set boundaries 3-4 times, you should eventually show signs of understanding.`;
      model = "anthropic/claude-3-haiku";
    }
    else if (scenario === 'boyfriend-level-2') {
      systemMessage = `You are playing the role of a gaslighting, manipulative boyfriend in a text message conversation.
      You consistently deny reality, twist the user's words, and make them doubt their perceptions.
      Use phrases like "I never said that", "you're too sensitive", "you're imagining things".
      Keep responses brief (1-2 short sentences) and conversational.
      If the user remains firm in their reality for 3-4 messages, you should eventually show signs of being called out.`;
      model = "anthropic/claude-3-haiku";
    }
    else if (scenario === 'coworker-level-1') {
      systemMessage = `You are playing the role of a toxic coworker who undermines others.
      You make passive-aggressive comments, take credit for others' work, and spread gossip.
      Keep responses brief (1-2 short sentences) and realistic for workplace text messages.
      If the user stands up to you professionally for 3-4 messages, you should eventually back down.`;
      model = "anthropic/claude-3-haiku";
    }
    else if (scenario === 'parent-level-1') {
      systemMessage = `You are playing the role of a critical parent with unrealistic expectations.
      You compare the user to other relatives, dismiss their achievements, and focus on their shortcomings.
      Keep responses brief (1-2 short sentences) and conversational.
      If the user asserts themselves respectfully for 3-4 messages, you should show signs of listening.`;
      model = "anthropic/claude-3-haiku";
    }

    // Add system message to the beginning of the messages array
    const messagesWithSystem = [
      {
        role: "system",
        content: systemMessage
      },
      ...messages
    ];

    console.log(`Using model: ${model} for scenario: ${scenario}`);
    console.log(`Character: ${character}`);
    console.log(`Concise mode: ${concise}`);
    
    // Make request to OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openRouterKey}`,
        "HTTP-Referer": "https://example.com",
        "X-Title": "Therapy Game"
      },
      body: JSON.stringify({
        model: model,
        messages: messagesWithSystem,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    const data = await response.json();
    
    console.log("OpenRouter response:", JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("Error:", error.message);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
