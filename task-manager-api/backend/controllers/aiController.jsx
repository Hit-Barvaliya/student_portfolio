let OpenAI;
try {
  OpenAI = require('openai');
} catch {
  OpenAI = null;
}

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 3000; // 3 seconds between requests

function checkRateLimit(clientId) {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(clientId) || 0;
  if (now - lastRequest < RATE_LIMIT_WINDOW_MS) {
    return false;
  }
  rateLimitMap.set(clientId, now);
  return true;
}

function generateLocalFallback(title) {
  const lower = title.toLowerCase();
  let priority = 'normal';
  let description = `Complete and review deliverables for "${title}". Ensure requirements are met and all steps verified.`;

  if (lower.includes('fix') || lower.includes('bug') || lower.includes('urgent') || lower.includes('error')) {
    priority = 'high';
    description = `Investigate root cause of "${title}", reproduce issue with test cases, apply fix, and verify resolution.`;
  } else if (lower.includes('test') || lower.includes('verify') || lower.includes('check')) {
    priority = 'normal';
    description = `Write and execute test suites covering all edge cases and assertions for "${title}".`;
  } else if (lower.includes('read') || lower.includes('doc') || lower.includes('learn') || lower.includes('study')) {
    priority = 'low';
    description = `Review official documentation and theory concepts regarding "${title}", noting key takeaways.`;
  } else if (lower.includes('deploy') || lower.includes('release') || lower.includes('docker') || lower.includes('build')) {
    priority = 'high';
    description = `Prepare deployment artifacts, verify configuration, and validate health checks for "${title}".`;
  }

  return { description, priority };
}

async function generateDescription(req, res) {
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, error: 'Title is required for AI description generation' });
  }

  const clientId = req.ip || req.headers['x-forwarded-for'] || 'default-client';
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit reached. Please wait a moment before requesting another AI suggestion.'
    });
  }

  const trimmedTitle = title.trim();
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Try OpenAI if key is present
  if (openAiKey && OpenAI) {
    try {
      const client = new OpenAI({ apiKey: openAiKey });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an assistant for a task management app. Given a task title, return a concise 1-2 sentence actionable description and suggested priority (low, normal, high).'
          },
          { role: 'user', content: `Task title: "${trimmedTitle}"` }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      const responseContent = completion.choices?.[0]?.message?.content || '';
      return res.status(200).json({
        success: true,
        description: responseContent.trim(),
        priority: 'normal',
        fallback: false,
        source: 'openai',
        disclaimer: 'AI-generated suggestion. Please review and modify as needed.'
      });
    } catch (err) {
      console.warn('[AI Controller] OpenAI API call failed, using graceful fallback:', err.message);
    }
  }

  // 2. Try Gemini if key is present
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const apiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate a concise 1-2 sentence description for a task titled "${trimmedTitle}".` }]
          }]
        })
      });

      if (apiRes.ok) {
        const geminiData = await apiRes.json();
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return res.status(200).json({
            success: true,
            description: text.trim(),
            priority: 'normal',
            fallback: false,
            source: 'gemini',
            disclaimer: 'AI-generated suggestion. Please review and modify as needed.'
          });
        }
      }
    } catch (err) {
      console.warn('[AI Controller] Gemini API call failed, using graceful fallback:', err.message);
    }
  }

  // 3. Graceful degradation fallback
  const fallbackData = generateLocalFallback(trimmedTitle);
  return res.status(200).json({
    success: true,
    description: fallbackData.description,
    priority: fallbackData.priority,
    fallback: true,
    source: 'heuristic-engine',
    disclaimer: 'AI-generated suggestion. Please review and modify as needed.'
  });
}

module.exports = {
  generateDescription,
  generateLocalFallback,
  resetRateLimit: () => rateLimitMap.clear()
};
