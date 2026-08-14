import crypto from "crypto"
import { google } from "googleapis"

function getEncryptionKey(): Buffer {
  const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("Falta clave de encriptación para tokens de Google")
  return crypto.createHash("sha256").update(key).digest()
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  let encrypted = cipher.update(token, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag().toString("hex")
  return iv.toString("hex") + ":" + authTag + ":" + encrypted
}

export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey()
  const parts = encryptedToken.split(":")
  if (parts.length !== 3) throw new Error("Formato de token encriptado inválido")
  const iv = Buffer.from(parts[0], "hex")
  const authTag = Buffer.from(parts[1], "hex")
  const encrypted = parts[2]
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

export function getRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "")
  return `${base}/api/google/auth/callback`
}

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET")
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri())
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  })
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return {
    access_token: credentials.access_token!,
    expires_in: credentials.expiry_date! - Date.now(),
  }
}

export async function createCalendarEvent(params: {
  accessToken: string
  summary: string
  description?: string
  startTime: Date
  endTime: Date
  addMeet: boolean
}) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: params.accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  const event: any = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }

  if (params.addMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    }
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    conferenceDataVersion: params.addMeet ? 1 : 0,
  })

  return {
    googleEventId: response.data.id!,
    htmlLink: response.data.htmlLink!,
    meetLink: response.data.hangoutLink ?? null,
  }
}

export async function updateCalendarEvent(params: {
  accessToken: string
  googleEventId: string
  summary: string
  description?: string
  startTime: Date
  endTime: Date
  addMeet: boolean
}) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: params.accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  const event: any = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }

  if (params.addMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    }
  }

  const response = await calendar.events.update({
    calendarId: "primary",
    eventId: params.googleEventId,
    requestBody: event,
    conferenceDataVersion: params.addMeet ? 1 : 0,
  })

  return {
    googleEventId: response.data.id!,
    htmlLink: response.data.htmlLink!,
    meetLink: response.data.hangoutLink ?? null,
  }
}

export async function deleteCalendarEvent(params: {
  accessToken: string
  googleEventId: string
}): Promise<void> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: params.accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })
  await calendar.events.delete({
    calendarId: "primary",
    eventId: params.googleEventId,
  })
}

export async function getUserEmail(accessToken: string): Promise<string> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()
  return data.email ?? ""
}

export async function revokeToken(accessToken: string): Promise<void> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  await oauth2Client.revokeCredentials()
}
