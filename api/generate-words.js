// api/generate-words.js
// Vercel serverless function — Groq API kaliti shu yerda, faqat
// serverda ishlaydi, brauzerga hech qachon jo'natilmaydi.
//
// Ishlashi uchun Vercel dashboard -> Settings -> Environment Variables
// bo'limiga GROQ_API_KEY nomi bilan kalitni qo'shing va Redeploy qiling.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY sozlanmagan (Vercel env variables)' });
  }

  const { topic, level, count } = req.body || {};
  if (!topic || !level || !count) {
    return res.status(400).json({ error: 'topic, level va count kerak' });
  }

  const safeCount = Math.max(1, Math.min(50, Number(count) || 10));

  const prompt = `Generate exactly ${safeCount} English vocabulary words about the topic "${topic}" at level ${level}. Return ONLY a valid JSON array, no other text, no markdown. Each object must have: "en" (English word lowercase), "uz" (Uzbek translation), "example" (one simple English sentence), "difficulty" ("${level}"), "category" ("${topic}"). Return exactly ${safeCount} items.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 8000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Groq API xato' });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server xatosi' });
  }
}
