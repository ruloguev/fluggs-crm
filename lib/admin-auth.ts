import crypto from "crypto"

const SECRET = process.env.ADMIN_JWT_SECRET ?? "flugzz-admin-secret-change-in-production"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@flugzz.xyz"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "flgz111093$"

export function createAdminToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({
      email: ADMIN_EMAIL,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    }),
  ).toString("base64url")
  const signature = crypto.createHmac("sha256", SECRET).update(`${header}.${payload}`).digest("base64url")
  return `${header}.${payload}.${signature}`
}

export function verifyAdminToken(token: string): boolean {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const [header, payload, signature] = parts
    const expectedSig = crypto.createHmac("sha256", SECRET).update(`${header}.${payload}`).digest("base64url")
    if (signature !== expectedSig) return false
    const data = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (data.exp < Math.floor(Date.now() / 1000)) return false
    if (data.email !== ADMIN_EMAIL) return false
    return true
  } catch {
    return false
  }
}

export function getAdminCredentials() {
  return { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
}
