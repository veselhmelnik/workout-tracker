const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const config = getDefaultConfig(__dirname)

config.resolver.assetExts.push('sql')

// The backend lives in server/ and is never imported by the app. Blocking it
// keeps Metro from watching and crawling its ~600 Node packages, which are
// irrelevant to the bundle and would only slow startup.
config.resolver.blockList = [
  new RegExp(`^${path.resolve(__dirname, 'server').replace(/[\\/]/g, '[\\\\/]')}[\\\\/].*`),
]

module.exports = config
