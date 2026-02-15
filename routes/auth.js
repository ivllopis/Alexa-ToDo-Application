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

router.post('/login', async (req, res, next) => {
	try {
		const username = req.body.username;
		const password = req.body.password;
		if (!username || !password) {
			return res.render('login', { error_msg: 'Please, enter username and password.' });
		}
		const envUser = process.env.APPLICATION_LOGIN_USER;
		const envSecret = process.env.APPLICATION_LOGIN_SECRET;
		if (!envUser || !envSecret) {
			console.error('Auth config missing: APPLICATION_LOGIN_USER or APPLICATION_LOGIN_SECRET not set.');
			return res.status(503).render('login', { error_msg: 'Login is not configured. Please try again later.' });
		}
		if (username !== envUser) {
			return res.render('login', { error_msg: 'This username does not appear in our database.' });
		}
		try {
			const match = await bcrypt.compare(password, envSecret);
			if (match) {
				req.session.user = username;
				req.session.loggedin = true;
				req.flash('success_msg', 'You are now logged in.');
				return res.redirect('/');
			}
			return res.render('login', { error_msg: 'The username and password are not correct.' });
		} catch (bcryptError) {
			console.error('Login bcrypt error:', bcryptError);
			return res.status(500).render('login', { error_msg: 'A temporary error occurred. Please try again.' });
		}
	} catch (err) {
		console.error('Login handler error:', err);
		next(err);
	}
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.redirect('/');
    });
});

module.exports = router;
module.exports.requireAuth = requireAuth;