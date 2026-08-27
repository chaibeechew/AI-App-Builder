import { getProviderStatus } from './lib_ai.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const providers = getProviderStatus();
    return res.status(200).json({
      ok: true,
      configuredCount: providers.filter((provider) => provider.configured).length,
      providers: providers.map((provider) => ({
        name: provider.name,
        type: provider.type,
        configured: Boolean(provider.configured),
        available: Boolean(provider.available),
        failures: provider.failures,
        success: provider.success,
      })),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Provider status unavailable' });
  }
}
