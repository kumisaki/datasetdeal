/**
 * Fails fast with a clear message when Node is too old for Vite 6+.
 * Run via: node scripts/check-node.cjs (works on Node 12+)
 */
const match = /^v(\d+)/.exec(process.version)
const major = match ? parseInt(match[1], 10) : 0
const min = 20

if (major < min) {
  console.error('')
  console.error('  DatasetDeal needs a newer Node.js.')
  console.error('  Current: ' + process.version)
  console.error('  Required: Node ' + min + '+ (use 22 LTS if you can).')
  console.error('')
  console.error('  WSL / Linux examples:')
  console.error('    nvm install 22 && nvm use 22')
  console.error('    conda install -c conda-forge nodejs=22')
  console.error('    https://nodejs.org/ — install LTS, then reopen the terminal.')
  console.error('')
  process.exit(1)
}
