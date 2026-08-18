/* release.js — 打包 ZIP + CRX3，生成 GitHub Release 附件 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const PARENT = path.dirname(ROOT);
const EXT_NAME = path.basename(ROOT);
const VERSION = require(path.join(ROOT, 'manifest.json')).version;

const KEY_FILE = path.join(PARENT, `${EXT_NAME}.key.pem`);
const ZIP_FILE = path.join(ROOT, `${EXT_NAME}-v${VERSION}.zip`);
const CRX_FILE = path.join(ROOT, `${EXT_NAME}-v${VERSION}.crx`);

// ── Protobuf 极小编码 ─────────────────────────────
function varint(n) {
  const b = [];
  while (n >= 0x80) { b.push((n & 0x7f) | 0x80); n >>>= 7; }
  b.push(n);
  return Buffer.from(b);
}
function lenDel(field, data) {
  return Buffer.concat([varint((field << 3) | 2), varint(data.length), data]);
}

// ── 签名上下文（Chromium 强制要求） ────────────────
const kSignatureContext = Buffer.from('CRX3 SignedData\x00', 'utf8');

function createSign(signedHeaderData) {
  const sign = crypto.createSign('sha256');
  sign.update(kSignatureContext);
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32LE(signedHeaderData.length, 0);
  sign.update(lenBuf);
  sign.update(signedHeaderData);
  return sign;
}

// ── 打包 ──────────────────────────────────────────
function main() {
  console.log(`📦 Packaging ${EXT_NAME} v${VERSION}\n`);

  // 1 ── ZIP ──────────────────────────────────────
  execSync(`git archive --format=zip -o "${ZIP_FILE}" HEAD`, { cwd: ROOT });
  const zipStat = fs.statSync(ZIP_FILE);
  console.log(`  ✅ ZIP: ${path.basename(ZIP_FILE)}  (${(zipStat.size / 1024).toFixed(1)} KB)`);

  // 2 ── 私钥 ────────────────────────────────────
  if (!fs.existsSync(KEY_FILE)) {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    fs.writeFileSync(KEY_FILE, privateKey);
    console.log(`  🔑 Key: ${path.basename(KEY_FILE)}  (新生成)`);
  } else {
    console.log(`  🔑 Key: ${path.basename(KEY_FILE)}  (已存在)`);
  }

  // 3 ── CRX3 ────────────────────────────────────
  const zipData = fs.readFileSync(ZIP_FILE);
  const pem = fs.readFileSync(KEY_FILE, 'utf8');
  const privateKey = crypto.createPrivateKey(pem);
  const publicKeyDer = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' });

  // crx_id = SHA256(public_key_der)[:16]
  const crxId = crypto.createHash('sha256').update(publicKeyDer).digest().subarray(0, 16);

  // SignedHeaderData { bytes crx_id = 1; }
  const signedHeaderData = lenDel(1, crxId);

  // 签名（带 Chromium 要求的上下文前缀）
  const sign = createSign(signedHeaderData);
  const signature = sign.sign(privateKey);

  // AsymmetricKeyProof { bytes public_key = 1; bytes signature = 2; }
  const proofMsg = Buffer.concat([
    lenDel(1, publicKeyDer),
    lenDel(2, signature),
  ]);

  // CrxFileHeader { AsymmetricKeyProof sha256_with_rsa = 2; bytes signed_header_data = 10000; }
  const headerMsg = Buffer.concat([
    lenDel(2, proofMsg),
    lenDel(10000, signedHeaderData),
  ]);

  // CRX3 文件格式: "Cr24" + version(3) + header_size + header + zip
  const magic = Buffer.from('Cr24', 'utf8');
  const version = Buffer.from([3, 0, 0, 0]);
  const hdrSize = Buffer.allocUnsafe(4);
  hdrSize.writeUInt32LE(headerMsg.length, 0);

  const crxData = Buffer.concat([magic, version, hdrSize, headerMsg, zipData]);
  fs.writeFileSync(CRX_FILE, crxData);
  const crxStat = fs.statSync(CRX_FILE);
  console.log(`  ✅ CRX3: ${path.basename(CRX_FILE)}  (${(crxStat.size / 1024).toFixed(1)} KB)`);

  // ── 信息 ───────────────────────────────────────
  const extId = Buffer.from(crxId).toString('hex');
  console.log(`\n  🔑 Extension ID: ${extId}`);
  console.log(`  📂 输出目录: ${ROOT}\n`);
  console.log('  ⚠️  key.pem 请妥善保管，丢失后旧 CRX 将无法验证更新。');
  console.log(`     （当前位于 ${KEY_FILE}）\n`);
}

main();