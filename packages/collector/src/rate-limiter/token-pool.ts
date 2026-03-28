const SAFE_LIMIT = 160; // 80% of 200/h Graph API limit

interface TokenSlot {
  token: string;
  callCount: number;
  windowStart: number;
}

export class TokenPool {
  private slots: TokenSlot[];

  constructor(tokens: string[]) {
    if (!tokens.length) throw new Error('TokenPool requires at least one token');
    this.slots = tokens.map((token) => ({
      token,
      callCount: 0,
      windowStart: Date.now(),
    }));
  }

  getToken(): string {
    const now = Date.now();
    const oneHour = 3_600_000;

    // Reset expired windows
    for (const slot of this.slots) {
      if (now - slot.windowStart >= oneHour) {
        slot.callCount = 0;
        slot.windowStart = now;
      }
    }

    const available = this.slots.find((s) => s.callCount < SAFE_LIMIT);
    if (!available) {
      throw new Error('All tokens exhausted — retry after rate limit window resets');
    }

    available.callCount++;
    return available.token;
  }
}
