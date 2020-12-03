'use strict';
require('dotenv').config({ path: './variables.env' });

const connectToDB = require('./db');
const Trade = require('./models/Trade');

module.exports.getTrades = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const query = event.queryParameters;
  console.log(query);

  connectToDB()
    .then(() => {
      Trade.find(query)
        .then(results => callback(null, {
          statusCode: 200,
          body: JSON.stringify(results)
        }))
        .catch(err => callback(null, {
          statusCode: err.statusCode || 500,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Could not fetch trades.'
        }))
    });
};

module.exports.getTradesByTrader = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const trader = event.pathParameters.trader || null;
  if (!trader) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing trader parameter'
    });
  }

  connectToDB()
    .then(() => {
      Trade.find({ trader: trader })
        .then(results => callback(null, {
          statusCode: 200,
          body: JSON.stringify(results)
        }))
        .catch(err => callback(null, {
          statusCode: err.statusCode || 500,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Could not fetch trades by given trader.'
        }))
    });
};

module.exports.createTrade = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const body = JSON.parse(event.body);

  connectToDB()
    .then(() => {
      if (body.contractPriceAtClose && body.contractPriceAtOpen) {
        body.roi = (body.contractPriceAtClose - body.contractPriceAtOpen) / body.contractPriceAtOpen;
      }
      console.log(body);
      Trade.create(body)
        .then(results => callback(null, {
          statusCode: 200,
          body: JSON.stringify(results)
        }))
        .catch(err => callback(null, {
          statusCode: err.statusCode || 500,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Could not create trade'
        }));
    });
};

module.exports.updateTrade = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const tradeId = event.pathParameters.tradeId || null;
  let body = JSON.parse(event.body);

  if (!tradeId) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing tradeId parameter'
    });
  }

  connectToDB()
    .then(async () => {
      let trade = await Trade.findById(tradeId).exec();
      if (!trade) {
        callback(null, {
          statusCode: 404,
          headers: { 'Content-Type': 'text/plain' },
          body: 'No trade found with given trade Id'
        });
      }

      if (body.contractPriceAtClose) {
        body.roi = (body.contractPriceAtClose - trade.contractPriceAtOpen) / trade.contractPriceAtOpen;
      }
  
      Object.keys(body).forEach(key => {
        trade[key] = body[key];
      });

      try {
        const result = await trade.save();
        callback(null, {
          statusCode: 200,
          body: JSON.stringify(result)
        });
      } catch (err) {
        callback(null, {
          statusCode: err.statusCode || 500,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Could not create trade'
        });
      }
    });
};