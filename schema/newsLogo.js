const mongoose = require("mongoose");

const addNewsPaper = new mongoose.Schema({
    newsPaperName: String,
    logo: String,
});

module.exports = mongoose.model("newspaper", addNewsPaper);
