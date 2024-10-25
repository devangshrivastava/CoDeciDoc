const async_handler = require('express-async-handler');
const User = require('../models/userModel');
const generateToken = require('../config/generateToken');


const registerUser = async_handler(async (req, res) => {
    const {name, email, password, pic} = req.body;
    if(!name || !email || !password){
        res.status(400);
        throw new Error('Please fill all the fields');
    }
    const userExist = await User.findOne({email});
    if(userExist){
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        pic,
    });

    if(user){
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            token: generateToken(user._id),
        });
        console.log('User created successfully');
    }else{
        res.status(400);
        throw new Error('Failed to create User, please try again');
    }
});


const authUser = async_handler(async (req, res) => {
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if(user && (await user.matchPassword(password))){
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            token: generateToken(user._id),
        });
    }
    else{
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

const allUsers = async_handler(async (req, res) => {
   
    // console.log(req.query.search);
    
    const keyword = req.query.search ? {
        $or: [
            {name: {$regex: req.query.search}},
            {email: {$regex: req.query.search}},
        ],
    }:{};

    const users = (await User.find(keyword))

    res.send(users);
});

module.exports = {registerUser, authUser, allUsers};