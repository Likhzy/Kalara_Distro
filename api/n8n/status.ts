import { getValidatedWebhookUrl } from '../../server/n8nProxy.ts';

interface ServerlessRequest {
  method?: string;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url, error } = getValidatedWebhookUrl();
  res.status(200).json({
    configured: Boolean(url),
    ...(error ? { configError: error } : {}),
  });
}
