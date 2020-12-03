const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let isConnected;

module.exports = connectToDB = () => {
  if (isConnected) {
    console.log('...using existing db connection');
    return Promise.resolve();
  }

  console.log('...using new db connection');
  return mongoose
    .connect(process.env.DB, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true })
    .then(db => {
      isConnected = db.connections[0].readyState;
    });
}