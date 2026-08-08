export class N8nService {
  constructor(private readonly webhookUrl = process.env.N8N_WEBHOOK_URL) {}

  get enabled() {
    return Boolean(this.webhookUrl)
  }

  async send(event: string, payload: Record<string, unknown>) {
    if (!this.webhookUrl) return { delivered: false }

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload }),
    })

    return { delivered: true }
  }
}
