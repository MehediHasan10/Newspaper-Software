const mongoose = require("mongoose");
const {isEmail} = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({ 
    email: {
        type: String, 
        required: [true, 'Please, provide an email address.'],
        unique: true,
        lowercase: true,
        validate: [isEmail, "Please, enter a valid email address."]
    },
    password: {
        type: String,
        required: [true, 'Please, provide a password.'],
        minlength: [8, 'Minimum length of the password is 8.']
    },
});

//fire a function befor e doc saved to the db
//hashing the passowrd

userSchema.pre('save',async function(next){
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

//static method to login the user
userSchema.statics.login = async function(email, password){
    const user = await this.findOne({email});
    if(user){
        const auth = await bcrypt.compare(password, user.password);
        if(auth){
            return user;
        }
        throw Error('Incorrect Password');
    }
    throw Error('Incorrect Email');
};

module.exports = mongoose.model('user', userSchema);
