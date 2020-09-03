const mongoose = require("mongoose");

const add = new mongoose.Schema({
    headline: String,
    pageNumber: String,
    newsPaper: String,
    district: String,
    date: Date,
    image: String,

});


module.exports = mongoose.model("news", add);
