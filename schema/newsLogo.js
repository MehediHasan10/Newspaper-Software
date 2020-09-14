const mongoose = require("mongoose");

const NewsPaperSchema = new mongoose.Schema({
    newsPaperName: String,
    logo: String,
});

const newspapers = mongoose.model("Newspapers", NewsPaperSchema);

module.exports = newspapers;
