export class N8nService {
  constructor(private readonly webhookUrl = process.env.N8N_WEBHOOK_URL) {}

  get enabled() {
    return Boolean(this.webhookUrl)
  }

  async send(event: string, payload: Record<string, unknown>) {
    if (!this.webhookUrl) return { delivered: false }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload }),
        signal: AbortSignal.timeout(10_000),
      })
      return { delivered: response.ok }
    } catch (cause) {
      console.error('n8n telemetry delivery failed', cause)
      return { delivered: false }
    }
  }
}
