const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const requireAuth = (req, res, next) => {
    if (req.session.loggedin) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

router.get('/', (req, res) => {
    res.redirect('/auth/login');
});

router.get('/login', (req, res) => {
    res.render('login', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')});
});

router.post('/login', async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	if (username && password) {
        if(username === process.env.APPLICATION_LOGIN_USER){
            try{
                if(await bcrypt.compare(password, process.env.APPLICATION_LOGIN_SECRET)){
                    req.session.user = username;
                    req.session.loggedin = true;
                    req.flash('success_msg', 'You are now logged in.');
                    res.redirect('/');
                } else {
                    res.render('login', {error_msg: 'The username and password are not correct.'});
                }
                
            } catch(error){
                console.log(error);
                res.sendStatus(500);
            }
        } else {
            res.render('login', {error_msg: 'This username does not appear in our database.'});
            //req.flash('error_msg', 'This username does not appear in our database.');
            //res.redirect('/auth/login');
        }
	} else {
        res.render('login', {error_msg: 'Please, enter username and password.'});
        //req.flash('error_msg', 'Please, enter username and password.');
        //res.redirect('/auth/login');
	}
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
module.exports.requireAuth = requireAuth;