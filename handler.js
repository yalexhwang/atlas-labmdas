'use strict';
require('dotenv').config({ path: './variables.env' });

const connectToDB = require('./db');
const { validateTradeData } = require('./validator');
const Trade = require('./models/Trade');

module.exports.getTrades = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const query = event.queryStringParameters;
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

  const params = event.pathParameters;
  const trader = params.traderId || null;

  if (!trader) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing trader parameter'
    });
    return;
  }

  connectToDB()
    .then(() => {
      const query = event.queryStringParameters;
      Trade.find({ ...query, traderId: trader })
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
  console.log(event);
  let body = JSON.parse(event.body);
  console.log(body);

  const validation = validateTradeData(body);
  console.log(validation);
  if (validation.error) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: validation.message
    });
    return;
  }

  body.positionType = body.positionType.toUpperCase();
  body.deletedAt = null;
  body.deleted = 0;

  let expirationArray = body.expiration.split("/");
  body.expiration = new Date(expirationArray[2], expirationArray[0] - 1, expirationArray[1]);

  if (body.contractPriceAtClose && body.contractPriceAtOpen) {
    body.roi = (body.contractPriceAtClose - body.contractPriceAtOpen) / body.contractPriceAtOpen;
  }

  connectToDB()
    .then(() => {
      Trade.create(body)
        .then(results => callback(null, {
          statusCode: 200,
          body: JSON.stringify(results)
        }))
        .catch(err => {
          console.log('Failed at creating trade', err);
          callback(null, {
            statusCode: err.statusCode || 500,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Could not create trade'
          })
        });
    });
};

module.exports.updateTrade = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const tradeId = event.pathParameters.tradeId || null;
  if (!tradeId) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing tradeId parameter'
    });
    return;
  }

  let body = JSON.parse(event.body);
  if (!body.traderId) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing trader Id'
    });
    return;
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
        return;
      }
  
      if (trade.traderId !== body.traderId) {
        callback(null, {
          statusCode: 403,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Trade does not belong to given trader Id'
        });
        return;
      }

      if (trade.deleted || trade.status !== 'OPEN') {
        callback(null, {
          statusCode: 403,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Already closed or deleted trade'
        });
        return;
      }
      
      if (body.positionType) {
        body.positionType = body.positionType.toUpperCase();
      }

      Object.keys(body).forEach(key => {
        trade[key] = body[key];
      });

      if (body.contractPriceAtClose) {
        trade.roi = (body.contractPriceAtClose - trade.contractPriceAtOpen) / trade.contractPriceAtOpen;
        trade.status = 'CLOSED';
      }

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
          body: 'Could not update trade'
        });
      }
    });
};

module.exports.deleteTrade = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const tradeId = event.pathParameters.tradeId || null;
  if (!tradeId) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing tradeId parameter'
    });
    return;
  }

  const body = JSON.parse(event.body);
  if (!body.traderId) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing trader Id'
    });
    return;
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
        return;
      }

      if (trade.traderId !== body.traderId) {
        callback(null, {
          statusCode: 403,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Trade does not belong to given trader Id'
        });
        return;
      }

      if (trade.deleted) {
        callback(null, {
          statusCode: 403,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Already deleted trade'
        });
        return;
      }
  
      trade.deleted = 1;
      trade.deletedAt = new Date().toUTCString();

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
          body: 'Could not delete trade'
        });
      }
    });
};