const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  traderId: { type: String, required: true },
  ticker: { type: String, required: true },
  positionType: {
    type: String,
    required: true,
    enum: ['CALL', 'PUT', 'SPREAD']
  },
  strikePrice: { type: Number, required: true },
  expiration: { type: Date, required: true },
  contractPriceAtOpen: { type: Number, required: true },
  contractPriceAtClose: { type: Number, default: null },
  roi: { type: Number, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Trade', TradeSchema);