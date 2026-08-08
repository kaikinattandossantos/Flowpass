const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: require('./app.json').expo,
}
