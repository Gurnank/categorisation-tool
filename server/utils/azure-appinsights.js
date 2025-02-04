const appInsights = require('applicationinsights')
const applicationVersion = require('../application-version')

const { packageData } = applicationVersion
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  // eslint-disable-next-line no-console
  console.log('Enabling azure application insights')
  appInsights
    .setup()
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .start()
  module.exports = appInsights.defaultClient
  appInsights.defaultClient.context.tags['ai.cloud.role'] = `${packageData.name}`
} else {
  module.exports = null
}
