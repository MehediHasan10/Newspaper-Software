const mongoose = require("mongoose");

// Get the Schema constructor
var Schema = mongoose.Schema;

const newsSchema = new Schema({
    headline: String,
    pageNumber: String,
    district: String,
    date: Date,
    image: String,
    newspapers: []

});

var news = mongoose.model("News", newsSchema);

module.exports = news;
