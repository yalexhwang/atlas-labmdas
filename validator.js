const { validate } = require("./models/Trade");

const validateTradeData = (trade) => {
  let missing = [];
  ['traderId', 'ticker', 'positionType', 'strikePrice', 'expiration', 'contractPriceAtOpen'].forEach(key => {
    if (trade[key] === undefined || trade[key] === null) {
      missing.push(key);
    }
  });
  if (missing.length > 0) {
    return {
      error: true,
      message: `Payload missing property: ${missing}`
    };
  }

  if (!['CALL', 'PUT', 'SPREAD'].includes(trade.positionType.toUpperCase())) {
    return {
      error: true,
      message: `Property 'positionType' should be one of the following: CALL, PUT, SPREAD`
    };
  }

  if (!validateExpiration(trade.expiration)) {
    return {
      error: true,
      message: `Property 'expiration' in incorrect format`
    };
  }

  return { error: false };
};

function validateExpiration(expirationString) {
  const expirationArray = expirationString.split("/");
  if (expirationArray.length !== 3) return false;
  
  const today = new Date();
  const year = Number(expirationArray[2]);
  if (year < today.getFullYear()) return false;

  const month = Number(expirationArray[0]);
  if (month < 1 || month > 12) return false;

  let lastDayOfMonth = 30;
  if ([1, 3, 5, 7, 8, 10, 12].includes(month)) {
    lastDayOfMonth = 31;
  } else if (month === 2 && year % 4 > 0) {
    lastDayOfMonth = 28;
  } else if (month === 2 && year % 4 === 0) {
    lastDayOfMonth = 29;
  }
  const day = Number(expirationArray[1]);
  if (day < 1 || day > lastDayOfMonth) return false;

  return true;
}

module.exports = {
  validateTradeData
};