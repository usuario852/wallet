// IA — puente con OpenAI.
//
// Existe por dos razones. La primera es que la clave puede vivir aquí, en una
// variable de entorno del servidor, en vez de en el teléfono. La segunda es que
// la búsqueda web de OpenAI solo funciona del lado del servidor.
//
// Si no hay `OPENAI_API_KEY`, este endpoint acepta la clave que el dispositivo
// manda en la cabecera `x-wallet-key`. Y si no existe ninguna de las dos,
// responde 501 y la app llama a OpenAI directamente desde el navegador.

const ALLOWED_MODELS = ['gpt-5.4-nano', 'gpt-5.6-luna', 'gpt-5.4-mini', 'gpt-5.4', 'gpt-5.6-terra', 'gpt-5.6-sol'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const serverKey = process.env.OPENAI_API_KEY;
  const deviceKey = req.headers['x-wallet-key'];
  const key = serverKey || (typeof deviceKey === 'string' && deviceKey.trim()) || '';
  if (!key) return res.status(501).json({ error: 'sin_clave' });

  // WAL-API-AI-005: el parseo iba fuera de try, así que un cuerpo malformado
  // derribaba la función en vez de devolver un 400.
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch (_) { return res.status(400).json({ error: 'json_malformado' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'cuerpo_invalido' });

  // WAL-API-AI-006: `input` debe ser una lista de turnos, no cualquier cosa, y
  // con un tamaño acotado.
  if (!Array.isArray(body.input) || !body.input.length) return res.status(400).json({ error: 'input_invalido' });
  if (body.input.length > 200) return res.status(400).json({ error: 'input_demasiado_largo' });
  const size = JSON.stringify(body.input).length;
  if (size > 600000) return res.status(413).json({ error: 'input_demasiado_grande', bytes: size });

  if (body.model && !ALLOWED_MODELS.includes(body.model)) {
    return res.status(400).json({ error: 'modelo_no_permitido', permitidos: ALLOWED_MODELS });
  }

  // WAL-API-AI-007: el servidor arma la petición con lo que permite, en vez de
  // reenviar lo que mande el cliente. Así nadie puede pedir un razonamiento
  // caro, un modelo ajeno o guardar la conversación.
  const EFFORTS = ['none', 'low', 'medium', 'high'];
  const safe = {
    model: body.model || 'gpt-5.4-nano',
    input: body.input,
    store: false,
    instructions: typeof body.instructions === 'string' ? body.instructions.slice(0, 20000) : '',
    reasoning: { effort: EFFORTS.includes(body.reasoning && body.reasoning.effort) ? body.reasoning.effort : 'low' }
  };
  if (Array.isArray(body.tools) && body.tools.length <= 60) safe.tools = body.tools;
  if (body.text && typeof body.text === 'object') safe.text = body.text;
  const maxTokens = Number(body.max_output_tokens);
  if (Number.isFinite(maxTokens) && maxTokens > 0) safe.max_output_tokens = Math.min(maxTokens, 8000);
  body = safe;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: { message: error.name === 'AbortError' ? 'La consulta tardó demasiado.' : 'No pude contactar con OpenAI.' } });
  } finally {
    clearTimeout(timer);
  }
}
