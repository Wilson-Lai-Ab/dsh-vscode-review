'use strict'

/**
 * Per-hunk Accept/Reject uses the proposed editorInsets API.
 * Stable VS Code only allows it when argv.json lists this extension id
 * (or the window is an Extension Development Host).
 */

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const EXTENSION_ID = 'dsn.dsh-review-vscode'
const ARGV_KEY = 'enable-proposed-api'

function argvJsonPaths() {
  const home = os.homedir()
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    return [
      path.join(appData, 'Code', 'argv.json'),
      path.join(appData, 'Code - Insiders', 'argv.json'),
    ]
  }
  const paths = [
    path.join(home, '.vscode', 'argv.json'),
    path.join(home, '.vscode-insiders', 'argv.json'),
  ]
  if (process.platform === 'darwin') {
    paths.push(path.join(home, 'Library', 'Application Support', 'Code', 'argv.json'))
    paths.push(path.join(home, 'Library', 'Application Support', 'Code - Insiders', 'argv.json'))
  } else {
    paths.push(path.join(home, '.config', 'Code', 'argv.json'))
    paths.push(path.join(home, '.config', 'Code - Insiders', 'argv.json'))
  }
  return paths
}

function primaryArgvPath() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, 'Code', 'argv.json')
  }
  return path.join(os.homedir(), '.vscode', 'argv.json')
}

function argvListsExtension(text, id) {
  if (!text || !id) return false
  if (!text.includes('"' + ARGV_KEY + '"')) return false
  return text.includes('"' + id + '"')
}

function defaultArgvContents(id) {
  return '{\n\t"' + ARGV_KEY + '": ["' + id + '"]\n}\n'
}

/**
 * Merge EXTENSION_ID into a JSONC argv.json body. Comments are preserved.
 * Returns { text, changed, reason }.
 */
function mergeArgvJson(text, id) {
  const extId = id || EXTENSION_ID
  if (!text || !String(text).trim()) {
    return { text: defaultArgvContents(extId), changed: true, reason: 'created' }
  }
  if (argvListsExtension(text, extId)) {
    return { text, changed: false, reason: 'already' }
  }

  const arrayRe = /("enable-proposed-api"\s*:\s*\[)([\s\S]*?)(\])/
  const arrayMatch = text.match(arrayRe)
  if (arrayMatch) {
    const inner = arrayMatch[2]
    const trimmed = inner.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').trim()
    let nextInner
    if (!trimmed) {
      nextInner = '"' + extId + '"'
    } else {
      const prefix = inner.replace(/\s+$/, '')
      const needsComma = /["\w]$/.test(prefix.trim())
      nextInner = prefix + (needsComma && !prefix.trim().endsWith(',') ? ',' : '') + ' "' + extId + '"'
    }
    const next = text.slice(0, arrayMatch.index)
      + arrayMatch[1] + nextInner + arrayMatch[3]
      + text.slice(arrayMatch.index + arrayMatch[0].length)
    return { text: next, changed: true, reason: 'updated-array' }
  }

  const idx = text.lastIndexOf('}')
  if (idx < 0) {
    return { text: defaultArgvContents(extId), changed: true, reason: 'replaced-invalid' }
  }
  const before = text.slice(0, idx)
  const stripped = before.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').trim()
  const comma = stripped.endsWith('{') ? '\n' : (stripped.endsWith(',') ? '\n' : ',\n')
  const insert = comma + '\t"' + ARGV_KEY + '": ["' + extId + '"]\n'
  return { text: before.replace(/\s+$/, '') + insert + text.slice(idx), changed: true, reason: 'inserted-key' }
}

function enableInArgvFile(filePath, id) {
  const extId = id || EXTENSION_ID
  const target = filePath || primaryArgvPath()
  let original = ''
  let existed = false
  try {
    original = fs.readFileSync(target, 'utf8')
    existed = true
  } catch {
    existed = false
  }
  const merged = mergeArgvJson(existed ? original : '', extId)
  if (!merged.changed) {
    return { path: target, status: 'already', reason: merged.reason }
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, merged.text)
  return { path: target, status: existed ? 'updated' : 'created', reason: merged.reason }
}

function enableInKnownArgvFiles(id) {
  const extId = id || EXTENSION_ID
  const seen = new Set()
  const results = []
  const candidates = [primaryArgvPath(), ...argvJsonPaths()]
  for (const p of candidates) {
    if (seen.has(p)) continue
    seen.add(p)
    const exists = fs.existsSync(p)
    // Always write the primary path; only touch other paths if they already exist
    // (don't create Insiders/alt argv files the user never uses).
    if (p !== primaryArgvPath() && !exists) continue
    try {
      results.push(enableInArgvFile(p, extId))
    } catch (e) {
      results.push({ path: p, status: 'error', error: e && e.message ? e.message : String(e) })
    }
  }
  return results
}

function main() {
  const results = enableInKnownArgvFiles()
  for (const r of results) {
    if (r.status === 'error') {
      console.error('argv.json ERROR ' + r.path + ': ' + r.error)
      continue
    }
    console.log('argv.json ' + r.status + ': ' + r.path)
  }
  const ok = results.some((r) => r.status === 'created' || r.status === 'updated' || r.status === 'already')
  if (!ok) {
    console.error('Failed to write enable-proposed-api for ' + EXTENSION_ID)
    process.exit(1)
  }
  console.log('Per-hunk Accept/Reject needs a FULL VS Code quit (Cmd+Q / Alt+F4), not Reload Window.')
}

module.exports = {
  EXTENSION_ID,
  ARGV_KEY,
  argvJsonPaths,
  primaryArgvPath,
  argvListsExtension,
  mergeArgvJson,
  enableInArgvFile,
  enableInKnownArgvFiles,
}

if (require.main === module) main()
