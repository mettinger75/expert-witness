/**
 * Google Drive Integration Service
 */

import { google, drive_v3 } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
]

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime?: string
  modifiedTime?: string
  parents?: string[]
  webViewLink?: string
}

export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/gdrive/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: state || '',
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export function createDriveClient(accessToken: string, refreshToken?: string): drive_v3.Drive {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  return google.drive({ version: 'v3', auth: oauth2Client })
}

export async function getAllFilesInFolder(drive: drive_v3.Drive, folderId: string): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink)',
      pageSize: 100,
      pageToken,
    })
    allFiles.push(...(response.data.files || []) as DriveFile[])
    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)

  return allFiles
}

export async function getAllFilesRecursive(
  drive: drive_v3.Drive,
  folderId: string,
  path: string = ''
): Promise<Array<DriveFile & { path: string }>> {
  const allItems = await getAllFilesInFolder(drive, folderId)
  const results: Array<DriveFile & { path: string }> = []

  for (const item of allItems) {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      const subPath = path ? `${path}/${item.name}` : item.name
      const subFiles = await getAllFilesRecursive(drive, item.id, subPath)
      results.push(...subFiles)
    } else {
      results.push({ ...item, path: path ? `${path}/${item.name}` : item.name })
    }
  }

  return results
}

export async function downloadFile(drive: drive_v3.Drive, fileId: string, mimeType: string): Promise<Buffer> {
  if (mimeType === 'application/vnd.google-apps.document') {
    const response = await drive.files.export({ fileId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' })
    return Buffer.from(response.data as ArrayBuffer)
  }
  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' })
  return Buffer.from(response.data as ArrayBuffer)
}

export function extractFolderIdFromUrl(url: string): string | null {
  const patterns = [/\/folders\/([a-zA-Z0-9_-]+)/, /id=([a-zA-Z0-9_-]+)/, /^([a-zA-Z0-9_-]+)$/]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function shouldProcessFile(file: DriveFile): boolean {
  return file.mimeType === 'application/pdf' ||
         file.mimeType === 'application/vnd.google-apps.document' ||
         file.name.toLowerCase().endsWith('.pdf')
}
