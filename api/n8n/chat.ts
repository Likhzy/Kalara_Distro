import { forwardChatToN8n, validateChatPayload } from '../../server/n8nProxy.ts';

interface ServerlessRequest {
  method?: string;
  body?: unknown;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: 'Body JSON tidak valid.' });
      return;
    }
  }

  const validation = validateChatPayload(body);
  if (!validation.data) {
    res.status(400).json({ error: validation.error ?? 'Permintaan tidak valid.' });
    return;
  }

  const response = await forwardChatToN8n(validation.data);
  if (!response.result) {
    res.status(response.status).json({ error: response.error });
    return;
  }

  res.status(200).json(response.result);
}
