const express = require("express");
const router = express.Router();
const fs = require("fs");

const newsModel = require("../schema/addNews");
const User = require("../schema/user");
const NewspaperModel = require("../schema/newsLogo");
const moment= require('moment') 

//const router = require("express").Router();
const jwt = require("jsonwebtoken");
const {requireAuth, checkUser} = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");

let pdf = require("html-pdf");
let ejs = require("ejs");

//multer setup for news image
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/myUploads');
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
  });  
var upload = multer({
    storage: storage,
 }).single("newsUp");


//multer setup for logo
var storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/logo');
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
  });  
var upload2 = multer({
    storage: storage2,
 }).single("logo");

//handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = {email:"", password:""};
    //incorrect email & password in login form
    if(err.message === "Incorrect Email"){
        errors.email = "That email is not registered";
    } 
    if(err.message === "Incorrect Password"){
        errors.password = "That password is not correct";
    }
    //duplicate
    if (err.code === 11000) {
        errors.email = "That email already exists";
        return errors;
    }
    // validation errors
    if (err.message.includes("user validation failed")) {
        Object.values(err.errors).forEach(({ properties }) => {
        errors[properties.path] = [properties.message];
    });
  }
  return errors;
};

//create a json web token
const maxAge = 3*24*60*60;

const createToken = (id) => {
  return jwt.sign({id}, "Hi Handsome", {
    expiresIn: maxAge
  });
};

// Route and Controller Actions

//@route  -  GET /
router.get("/", (req, res) => {
    res.render("pages/index");
    //res.send("This is home page.");
});

//@route  -  GET /addForm
router.get("/addForm", requireAuth, async (req, res) => {
    try {
        const newspaper = await NewspaperModel.find({});
        res.render("pages/form", {output:newspaper});
    } catch (err) {
        console.log(`ERROR : ${err}`);
    }
});

//@route  - POST /addForm
router.post("/addForm",upload, async (req, res, next) => {
    const path = req.file && req.file.path;
    if(path){
        const newspaper = await NewspaperModel.findOne({_id: req.body.newsPaper });
        var imagePath = "/myUploads/" + req.file.filename;

        const tags = req.body.tags;
        const aTags = tags.split(',');
        const finalTags = aTags.map(Function.prototype.call, String.prototype.trim); //Trim the values in array .

        const data = new newsModel({
            headline: req.body.headline,
            pageNumber: req.body.pageNumber,
            // newsPaper: req.body.newsPaper,
            district: req.body.district,
            tags: finalTags,
            date: req.body.date,
            image: imagePath,
            newspapers: newspaper
        });

        try {
            const newsData = await data.save();
            res.redirect('/addForm');
        } catch (err) {
            console.log(`ERROR : ${err}`);
        }
    } else {
        
        console.log("file not uploaded successfully");
    }
    
});

//@route  -  GET /addNewsPaper
router.get("/addNewsPaper", requireAuth, (req, res) => res.render("pages/addNewsPaper"));

//@route  - POST /addNewsPaper
router.post("/addNewsPaper", upload2, async (req, res, next) =>{
    const path = req.file && req.file.path;
    if(path){
        var logoPath = "/logo/" + req.file.filename;
        const newsData = new NewspaperModel ({
            newsPaperName: req.body.newsPaperName,
            logo: logoPath
        });
        try{
            const newsPaperData = await newsData.save();
            res.redirect("/addNewsPaper");
        } catch (err) {
            console.log(`Error: ${err}`);
        }
    } else {
        console.log("File is not uploaded successfully...");
    }
})

//@route  -  GET /showTable
router.get("/showTable", async (req, res) => {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = mm + '/' + dd + '/' + yyyy;
    try {
        const tableData = await newsModel.find({
            date:{
                $gte: today,
            }
        });
        res.render('pages/table', {
            output:tableData,
            moment: moment
        }); 
    } catch (err) {
        console.log(`ERROR : ${err}`);
    }
});

//@route  - GET/ archieve
router.get("/archieve", async (req, res) => {
    
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = mm + '/' + dd + '/' + yyyy;

    try {
        const newspaper = await NewspaperModel.find({});
        const tableData = await newsModel.find({
            date: {
                $lt: today,
            }
        });
        res.render('pages/archieve', {
            output:tableData, 
            newspaper: newspaper,
            moment: moment
        });
    } catch (err) {
        console.log(`ERROR : ${err}`);
    }
});

//@route  -  GET /showTable/id
router.get("/open/:id", async (req, res) => {
    try {
        const tableDataById = await newsModel.findById(req.params.id);
        // console.log(tableDataById);
        res.render('pages/open', {
            output:tableDataById,
            moment: moment
        });
    } catch (err) {
        console.log(`ERROR : ${err}`);
    }
});

//@route - GET /generate PDF
router.get("/generateReport/:id", async (req, res) => {

    const tableDataById = await newsModel.findById(req.params.id);
    // console.log("sjdfhbsj",tableDataById);
    ejs.renderFile(path.join(__dirname, '../views/pages/', "pdf.ejs"), {output:tableDataById, dirname:__dirname, moment: moment}, (err, data) => {
        
        if (err) {
            // console.log("error",err);
            res.send(err);
        } else {
            var assesPath = path.join(__dirname,'../public/');
            // console.log(assesPath);
            assesPath = assesPath.replace(new RegExp(/\\/g), '/');

            var options = {
                "height": "11.25in",
                "width": "8.5in",
                "header": {
                    "height": "20mm",
                },
                "footer": {
                    "height": "20mm",
                },
                "base": "file:///" + assesPath
            };
            // pdf.create(data, options).toBuffer(function (err, buffer) {
            //     if (err) {
            //         res.send(err);
            //     } else {    
            //         res.type('pdf');
            //         res.end(buffer,'binary')
            //         // res.send("File created successfully");
            //     }
            // });

            pdf.create(data, options).toStream(function (err, stream) {
                if (err) return res.send(err);
                res.type('pdf');
                stream.pipe(res);
            });
        }
    });
});

//@route  -  GET /edit/:id
router.get('/edit/:id', async (req, res) => {
    try {
        const editData = await newsModel.findById(req.params.id);
        const newspaper = await NewspaperModel.find();
        res.render('pages/edit', {
            output:editData,
            paperOutput: newspaper
        });
    } catch (err) {
        console.log(`Error : ${err}`);
    }
});

//@route  -  POST /update/id
router.post("/update/:id", upload, async (req, res) => {
    var path = req.file && req.file.path;

    if(path){
        try {
            var imagePath = "/myUploads/" + req.file.filename;

            const tags = req.body.tags;
            const aTags = tags.split(',');
            const finalTags = aTags.map(Function.prototype.call, String.prototype.trim);

            // Date manipulation to get the right redirect url
            var today = new Date();
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            var yyyy = today.getFullYear();
            today = yyyy+ '-' +mm+ '-' +dd;

            // console.log(req.body);
            const newspaper = await NewspaperModel.findOne({_id: req.body.newsPaper });
            const tableUpdates = await newsModel.findById(req.params.id);

            tableUpdates.headline = req.body.headline;
            tableUpdates.newspapers = newspaper;
            tableUpdates.pageNumber = req.body.pageNumber;
            tableUpdates.tags = finalTags;
            tableUpdates.district = req.body.district;
            tableUpdates.date = req.body.date;
            tableUpdates.image = imagePath;
            const tableUpdatesSave = await tableUpdates.save();

            if(moment(req.body.date).isSameOrAfter(today) ) {
                res.redirect('/showTable');
            } else {
                res.redirect('/archieve');
            }

        } catch (err) {
            console.log(`ERROR : ${err}`);
        }
    }else{

        try {
            // console.log(req.body);
            const newspaper = await NewspaperModel.findOne({_id: req.body.newsPaper });
            const tableUpdates = await newsModel.findById(req.params.id);

            const tags = req.body.tags;
            const aTags = tags.split(',');
            const finalTags = aTags.map(Function.prototype.call, String.prototype.trim);
        
            tableUpdates.headline = req.body.headline;
            tableUpdates.newspapers = newspaper;
            tableUpdates.pageNumber = req.body.pageNumber;
            tableUpdates.tags = finalTags;
            tableUpdates.district = req.body.district;
            tableUpdates.date = req.body.date;
            tableUpdates.demo = newspaper

            // Date manipulation to get the right redirect url 
            var today = new Date();
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            var yyyy = today.getFullYear();
            today = yyyy+ '-' +mm+ '-' +dd;

            if(moment(req.body.date).isSameOrAfter(today) ) {
                res.redirect('/showTable');
            } else {
                res.redirect('/archieve');
            }

            const tableUpdatesSave = await tableUpdates.save();
            // console.log("tableUpdatesSave",tableUpdatesSave);
            res.redirect('/archieve');

        } catch (err) {
            console.log(`ERROR : ${err}`);
        }
    }
    
});

//@route  -  DELETE /id
router.get("/delete/:id", async (req, res) => {
    try {
        const tableDelete = await newsModel.findById(req.params.id);

        //console.log(tableDelete.image);

        //Date manipulation to get the right redirect url
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        today = yyyy+ '-' +mm+ '-' +dd;
        
        // Delete express file system 
        fs.unlink("./public" + tableDelete.image, (err) => {
            if (err) {
                console.log("failed to delete local image:"+err);
            }
        });

        if(moment(tableDelete.date).isSameOrAfter(today) ) {
            await tableDelete.remove();
            res.redirect('/showTable');
        } else {
            await tableDelete.remove();
            res.redirect('/archieve');
        }
        
    } catch (err) {
        console.log(`ERROR : ${err}`);
    }
});

//@route  -  POST /filterNews
router.post("/filterNews", async (req, res) => {
    
    var nPaper = req.body.newsPaper;
    var dName = req.body.district;
    var date = req.body.date;

    try {
        const newspaper = await NewspaperModel.find({});
        if(nPaper === ''){
            if(date === ''){
                const filterData = await newsModel.find({district: dName});
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            } else if(dName === ''){
                const filterData = await newsModel.find({date: date});
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            } else {
                const filterData = await newsModel.find({district: dName, date: date});
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            }

        } else if(date === ''){
            if (nPaper === '') {
                const filterData = await newsModel.find({district: dName});
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            } else if (dName === ''){
                const filterData = await newsModel.find({
                    "newspapers.newsPaperName" : nPaper
                });
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            } else {
                const filterData = await newsModel.find({
                    "newspapers.newsPaperName" : nPaper,
                    district: dName
                });
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            }

        } else if (dName === ''){
            if (nPaper === '') {
                const filterData = await newsModel.find({date: date});
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            } else if (date === '') {
                // const filterData = await newsModel.find({newspapers: {$elemMatch: {newsPaperName: nPaper}}});
                const filterData = await newsModel.find({
                    "newspapers.newsPaperName" : nPaper
                });
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            } else {
                // const filterData = await newsModel.find({date: date, newspapers: {$elemMatch: {newsPaperName: nPaper}} });
                const filterData = await newsModel.find({
                    "newspapers.newsPaperName" : nPaper
                });
                res.render('pages/archieve', {
                    output:filterData, 
                    newspaper: newspaper,
                    moment: moment
                });
            }

        } else {
            // const filterData = await newsModel.find({newspapers: {$elemMatch: {newsPaperName: nPaper}}, district: dName, date: date});

            const filterData = await newsModel.find({
                "newspapers.newsPaperName" : nPaper,
                district: dName,
                date: date
            });
            res.render('pages/archieve', {
                output:filterData, 
                newspaper: newspaper,
                moment: moment
            });
        }   
    } catch (err) {
        console.log(`Error: ${err}`);
    }
});

//@route  -  POST  /filterTag
router.post("/filterTag", async (req, res) => {
    var tag = req.body.tags;
    var trimmedTag = tag.trim();
    // console.log(trimmedTag);

    try {
        const newspaper = await NewspaperModel.find({});
        const filterTags = await newsModel.find({tags : trimmedTag});

        res.render('pages/archieve', {
            output:filterTags, 
            newspaper: newspaper,
            moment: moment
        });
        //res.redirect('/archieve')
    } catch (err) {
        console.log(err);
    }
});

//@route  -  GET /auto completion
router.get('/auto', (req, res) => {
    //console.log("aaa");
    var regex = new RegExp(req.query["term"], 'i');
    var  allTags = newsModel.find({tags: regex}, {"tags": 1}).limit(20);
    allTags.exec(function(err, data) {
        //console.log("data",data);
        var result = [];
        if (!err) {
             if(data && data.length && data.length>0){
                 data.forEach(user => {
                     let obj = {
                         id: user._id,
                         label: user.tags
                     };
                     result.push(obj);
                 });
            }
            //console.log("result",result);
            res.jsonp(result);
        }
    });
});


//Auth-Routes

//signup - GET
router.get("/signup", (req, res) => {
    res.render("pages/auth/signup");
});

//login  - GET
router.get("/login", (req, res) => {
    res.render("pages/auth/login");
});

//signup - POST
router.post("/signup", async (req, res) => {
    const {email, password} = req.body;
    try {
        const user = await User.create({email, password});
        const token = createToken(user._id);
        res.cookie("jwt", token, {httpOnly: true, maxAge:maxAge*1000});
        res.status(201).json({user: user._id});
    } catch (err) {
        const error = handleErrors(err);
        res.status(400).json({ error });
    }
});

//login - POST
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.cookie("jwt", token, {httpOnly: true, maxAge:maxAge*1000});
        res.status(201).json({user: user._id});
    } catch (err) {
        const error = handleErrors(err);
        res.status(400).json({error});
    }
});

//Logout - GET
router.get('/logout', async (req, res) => {
    res.cookie("jwt", "", { maxAge:1 });
    res.redirect("/");
});


module.exports = router;
