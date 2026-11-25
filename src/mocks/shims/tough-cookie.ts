/**
 * Build-time replacement for `tough-cookie`, aliased in vite.config.ts for the browser bundle.
 *
 * MSW keeps a cookie jar so mocked `Set-Cookie` headers reach later requests. This API never
 * uses cookies (sessions travel as `Authorization: Bearer`), and the real library pulls the whole
 * public-suffix list into the demo's critical path. The shim keeps MSW's calls working as a
 * permanently empty jar.
 */
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
