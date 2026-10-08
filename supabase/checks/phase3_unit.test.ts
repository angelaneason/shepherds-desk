// Phase 3 local unit test (no database, no network).
// Run: node --experimental-strip-types supabase/checks/phase3_unit.test.ts
import * as crypto from 'node:crypto'
import {
  canonicalString, verifyDeviceSignature, timestampFresh, nonceValid,
  buildServiceAccountJwt, signUnlockToken, verifyUnlockToken,
  generatePairingCode, normalizePairingCode, hashPairingCode,
} from '../../src/lib/bridge/crypto.ts'

let pass = 0, failCount = 0
const check = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log('PASS', name) } else { failCount++; console.log('FAIL', name) }
}

// Device signature: same as Android Keystore SHA256withECDSA (DER) with an SPKI public key.
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
const spkiB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
const body = JSON.stringify({ status: 'sent' })
const ts = String(Date.now())
const nonce = crypto.randomBytes(16).toString('hex')
const canon = canonicalString('POST', '/api/bridge/jobs/abc/status', ts, nonce, body)
const sig = crypto.sign('sha256', Buffer.from(canon), privateKey).toString('base64')
check('valid signature verifies', verifyDeviceSignature(spkiB64, canon, sig) === true)
const tampered = canonicalString('POST', '/api/bridge/jobs/abc/status', ts, nonce, JSON.stringify({ status: 'failed' }))
check('tampered body rejected', verifyDeviceSignature(spkiB64, tampered, sig) === false)
const other = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
check('other key rejected', verifyDeviceSignature(other, canon, sig) === false)
check('garbage signature rejected', verifyDeviceSignature(spkiB64, canon, 'bm90YXNpZw==') === false)
check('garbage key rejected', verifyDeviceSignature('bm90YWtleQ==', canon, sig) === false)

// Freshness and nonce format
check('fresh timestamp ok', timestampFresh(ts) === true)
check('old timestamp rejected', timestampFresh(String(Date.now() - 5 * 60 * 1000)) === false)
check('nonce valid', nonceValid(nonce) === true)
check('short nonce rejected', nonceValid('abc') === false)

// FCM service account JWT (RS256), verified locally with the matching public key
const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const jwt = buildServiceAccountJwt('bridge@test.iam.gserviceaccount.com', pem, 1_800_000_000)
const [h, p, s] = jwt.split('.')
const claims = JSON.parse(Buffer.from(p, 'base64url').toString())
check('jwt has 3 parts', !!(h && p && s))
check('jwt claims', claims.iss === 'bridge@test.iam.gserviceaccount.com' && /firebase\.messaging/.test(claims.scope) && claims.exp > claims.iat)
check('jwt RS256 signature verifies', crypto.verify('sha256', Buffer.from(`${h}.${p}`), rsa.publicKey, Buffer.from(s, 'base64url')))

// Unlock cookie
const secret = 'test-secret'
const exp = Date.now() + 60_000
const tok = signUnlockToken(secret, 'user-1', exp)
check('unlock token valid', !!verifyUnlockToken(secret, tok, 'user-1'))
check('unlock token other user rejected', !verifyUnlockToken(secret, tok, 'user-2'))
check('unlock token expired rejected', !verifyUnlockToken(secret, signUnlockToken(secret, 'user-1', Date.now() - 1), 'user-1'))
check('unlock token wrong secret rejected', !verifyUnlockToken('other', tok, 'user-1'))

// Pairing code
const code = generatePairingCode()
check('pairing code length', normalizePairingCode(code).length === 8)
check('pairing hash stable + normalized', hashPairingCode(secret, code) === hashPairingCode(secret, code.toLowerCase()) || hashPairingCode(secret, normalizePairingCode(code)) === hashPairingCode(secret, normalizePairingCode(code.toLowerCase())))

console.log(`\n${pass} passed, ${failCount} failed`)
process.exit(failCount ? 1 : 0)
