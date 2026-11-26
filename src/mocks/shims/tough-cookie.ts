export class Cookie {
  static fromJSON(): Cookie | null {
    return null
  }

  toJSON() {
    return {}
  }
}

export class MemoryCookieStore {
  idx: Record<string, unknown> = {}
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {
    void _store
  }

  getCookiesSync(): Cookie[] {
    return []
  }

  async setCookie(): Promise<void> {}
}
