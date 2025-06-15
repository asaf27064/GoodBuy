const mongoose = require('mongoose')
module.exports = mongoose.model(
  'SystemMeta',
  new mongoose.Schema({
    _id          : { type: String, default: 'price-refresh' },
    lastRunStart : Date,
    lastRunEnd   : Date,
    lastRunOk    : Boolean,
    nextPlanned  : Date
  }),
  'system_meta'
)
