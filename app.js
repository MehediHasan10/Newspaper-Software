const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const {requireAuth, checkUser} = require("./middleware/authMiddleware");



//const url = "mongodb://localhost:27017/newsPaper";
const url = "mongodb+srv://el06:test1234@cluster0.a9rlb.mongodb.net/newsSoftware";
const port = process.env.PORT || 8000;
const app = express();

//body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.json());
app.use(cookieParser());

// Database connection
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true });
const db = mongoose.connection;
db.on("open", () => console.log("DB Connection Successfull !"));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//Checking the user
app.get("*", checkUser);

// routing handler
const indexRouter = require("./routes/routing");
app.use("/", indexRouter);

// set up public folder
app.use(express.static("./public"));

//server listener
app.listen(port, () => console.log(`Server is running at port: ${port}`));
