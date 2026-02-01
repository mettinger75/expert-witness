export const gdriveService = {
  getAuthUrl(caseId?: string): string {
    return caseId ? `/api/gdrive/auth?caseId=${caseId}` : '/api/gdrive/auth'
  },

  async syncFolder(caseId: string, folderIdOrUrl: string) {
    const isUrl = folderIdOrUrl.includes('/')
    const body = isUrl ? { caseId, folderUrl: folderIdOrUrl } : { caseId, folderId: folderIdOrUrl }

    const response = await fetch('/api/gdrive/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      let errorMsg = `Sync failed (${response.status})`
      try { const err = await response.json(); errorMsg = err.error || errorMsg } catch { /* non-JSON */ }
      throw new Error(errorMsg)
    }

    return response.json()
  },

  async isConnected(): Promise<boolean> {
    const response = await fetch('/api/gdrive/status')
    const data = await response.json()
    return data.connected === true
  },

  async disconnect(): Promise<void> {
    await fetch('/api/gdrive/status', { method: 'DELETE' })
  },
}
