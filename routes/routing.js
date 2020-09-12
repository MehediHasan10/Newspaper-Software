const express = require("express");
const router = express.Router();
//const router = require("express").Router();
const jwt = require("jsonwebtoken");
const {requireAuth, checkUser} = require("../middleware/authMiddleware");


const multer = require("multer");
const path = require("path");
const puppeteer = require("puppeteer");

const newsModel = require("../schema/addNews");
const User = require("../schema/user");
const NewspaperModel = require("../schema/newsLogo");

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
//@desc   -  a route to the home page.
//@access -  public
router.get("/", (req, res) => {
    res.render("pages/index");
    //res.send("This is home page.");
});


//@route  -  GET /addForm
//@desc   -  a route to the add page
//@access -  public
router.get("/addForm", requireAuth, (req, res) => res.render("pages/form"));


//@route  - POST /addForm
//@desc   - data fetching from the add page
//@access - private
router.post("/addForm",upload, async (req, res, next) => {
    //console.log("file",req.file);
    //console.log(req.body)
    const path = req.file && req.file.path;
    //console.log(path);
    if(path){
        var imagePath = "/myUploads/" + req.file.filename;
        const data = new newsModel({
            headline: req.body.headline,
            pageNumber: req.body.pageNumber,
            newsPaper: req.body.newsPaper,
            district: req.body.district,
            date: req.body.date,
            image: imagePath,
        });
        try {
            const newsData = await data.save();
            res.redirect('/addForm');
        } catch (err) {
            console.log(`ERROR : ${err}`);
        }
    }else{
        
        console.log("file not uploaded successfully");
    }
    
});


//@route  -  GET /addNewsPaper
//@desc   -  a route to the addNewsPaper page
//@access -  private
router.get("/addNewsPaper", requireAuth, (req, res) => res.render("pages/addNewsPaper"));


//@route  - POST /addNewsPaper
//@desc   - data fetching from the addNewspapaer page
//@access - private
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
//@desc   -  a route to the the display page
//@access -  public
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
        //console.log(tableData);
        res.render('pages/table', {output:tableData}); 
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
    //var today = new Date();
    //console.log(today , new Date('2020-08-20'));
    //console.log(today < new Date('2020-08-20'));
    try {
        const tableData = await newsModel.find({
            date: {
                $lt: today,
            }
        });
        res.render('pages/archieve', {output:tableData});
    } catch (err) {
        console.log(`ERROR : ${err}`);
    }
});


//@route  -  GET /showTable/id
//@desc   -  a route to the the display page
//@access -  public
router.get("/open/:id", async (req, res) => {
    try {
        const tableDataById = await newsModel.findById(req.params.id);
        // console.log(tableDataById);
        res.render('pages/open', {output:tableDataById});
    } catch (err) {
        console.log(`ERROR : ${err}`);
    }
});


//@route  -  GET /edit/:id
//desc    - 
//access  -  public
router.get('/edit/:id', async (req, res) => {
    try {
        const editData = await newsModel.findById(req.params.id);
        res.render('pages/edit', {output:editData});
    } catch (err) {
        console.log(`Error : ${err}`);
    }
});


//@route  -  POST /update/id
//@desc   -  a route to a specific id, which value is updated
//@access -  public
router.post("/update/:id",upload, async (req, res) => {
    var path = req.file && req.file.path;
    if(path){
        try {
            var imagePath = "/myUploads/" + req.file.filename;
            // console.log(req.body);
            const tableUpdates = await newsModel.findById(req.params.id);
            tableUpdates.headline = req.body.headline;
            tableUpdates.newsPaper = req.body.newsPaper;
            tableUpdates.pageNumber = req.body.pageNumber;
            tableUpdates.district = req.body.district;
            tableUpdates.date = req.body.date;
            tableUpdates.image = imagePath;
            const tableUpdatesSave = await tableUpdates.save();
            //console.log(tableUpdatesSave);
            res.redirect('/showTable');
        } catch (err) {
            console.log(`ERROR : ${err}`);
        }
    }else{
        try {
            // console.log(req.body);
            const tableUpdates = await newsModel.findById(req.params.id);
            tableUpdates.headline = req.body.headline;
            tableUpdates.newsPaper = req.body.newsPaper;
            tableUpdates.pageNumber = req.body.pageNumber;
            tableUpdates.district = req.body.district;
            tableUpdates.date = req.body.date;
            const tableUpdatesSave = await tableUpdates.save();
            //console.log(tableUpdatesSave);
            res.redirect('/showTable');
        } catch (err) {
            console.log(`ERROR : ${err}`);
        }
    }
    
});


//@route  -  DELETE /id
//@desc   -  a route to a specific id, which value is deleted
//@access -  public
router.get("/delete/:id", async (req, res) => {
    try {
        const tableDelete = await newsModel.findById(req.params.id);
        const tableDeleteById = await tableDelete.remove();
        res.redirect("/showTable");
    } catch (err) {
        console.log(`ERROR : ${err}`);
    }
});


//@route  -  POST /filterNews
//@desc   -  a route to filter the news
//@access -  public
router.post("/filterNews", async (req, res) => {
    var nPaper = req.body.newsPaper;
    var dName = req.body.district;
    var date = req.body.date;

    // console.log("data",req.body);
    // console.log("dname:",dName);
    // console.log('npaper:',nPaper);
    // console.log("date:",date); 
    try {
        if(nPaper === ''){
            if(date === ''){
                const filterData = await newsModel.find({district: dName});
                res.render('pages/archieve', {output:filterData});
            } else if(dName === ''){
                const filterData = await newsModel.find({date: date});
                res.render('pages/archieve', {output:filterData});
            } else {
                const filterData = await newsModel.find({district: dName, date: date});
                res.render('pages/archieve', {output:filterData});
            }
        } else if(date === ''){
            if (nPaper === '') {
                const filterData = await newsModel.find({district: dName});
                res.render('pages/archieve', {output:filterData});                
            } else if (dName === ''){
                const filterData = await newsModel.find({newsPaper: nPaper});
                res.render('pages/archieve', {output:filterData});
            } else {
                const filterData = await newsModel.find({district: dName, newsPaper: nPaper});
                res.render('pages/archieve', {output:filterData});
            }
        } else if (dName === ''){
            if (nPaper === '') {
                const filterData = await newsModel.find({date: date});
                res.render('pages/archieve', {output:filterData});
            } else if (date === '') {
                const filterData = await newsModel.find({newsPaper: nPaper});
                res.render('pages/archieve', {output:filterData});
            } else {
                const filterData = await newsModel.find({date: date, newsPaper: nPaper});
                res.render('pages/archieve', {output:filterData});
            }
        } else {
            const filterData = await newsModel.find({newsPaper: nPaper, district: dName, date: date});
            //console.log(filterData);
            //res.redirect('/showTable')
            res.render('pages/archieve', {output:filterData});
        }   
    } catch (err) {
        console.log(`Error: ${err}`);
    }
});

//pdfGeneration
// router.get('/pdfGenerate', async (req, res) => {
//     try {
//             const browser = await puppeteer.launch()
//             const page = await browser.newPage()
//             await page.goto('https://www.medium.com')
//             await page.pdf({path: 'medium.pdf', format: 'A4'});    
//             await browser.close()
        
//     } catch (err) {
//         console.log(err);
//     }
// })

//Auth-Routes

//signup - GET
router.get("/signup", (req, res) => {
    res.render("pages/signup");
});

//login  - GET
router.get("/login", (req, res) => {
    res.render("pages/login");
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
