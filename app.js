// import required modules
const express = require('express');
const session = require("express-session");
const https = require('https');
const mongoose = require('mongoose');
const favicon = require('serve-favicon');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const cors = require("cors");
const flash = require("connect-flash");
const cookieParser = require('cookie-parser');

// import routes
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const toolRoutes = require('./routes/toolRoutes');
const partRoutes = require('./routes/partRoutes');
const nfcRoutes = require('./routes/nfcRoutes');

// import controllers
const clientController = require('./controllers/clientController');
const dashboardController = require('./controllers/dashboardController');

// import authenticate user cofig
const { ensureAuthenticated } = require('./config/auth');

// import passport config
require("./config/passport")(passport);

// import .env config for environment variables
require('dotenv').config();

// create express app
const app = express();

// set application port and ssl certificate
const port = process.env.PORT || 443;
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname,'sslcert/server.key')),
    cert: fs.readFileSync(path.join(__dirname,'sslcert/server.crt'))
}

// create https server using ssl certificate
const server = https.createServer(httpsOptions, app);

// set socket io to use by express server
const io = require("socket.io")(server);

// connect the socket in server
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// connect to mongodb & listen for requests
const uri = process.env.MONGODB_URI;
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
};

mongoose.connect(uri, options).then((result) => {
    console.log("Database connected");
    server.listen(port, () => {
        console.log(`https://localhost:${port}`);
    });
}).catch((err) => {
    console.log(err);
});

// set view engine
app.set('view engine', 'ejs');

/// middlewares
// set express app to handle cors
app.use(cors());

// set static files
app.use(express.static('public'));

// set favicon
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));

// use express body parser & cookie parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// set express session & connect flash middleware
app.use(
	session({
		secret: process.env.SECRET,
		resave: true,
		saveUninitialized: true,
		cookie: {
            secure: true,
			maxAge: 3600000
		}
	})
);
app.use(flash());

// passport middleware
app.use(passport.initialize());
app.use(passport.session());

/// routes
// client routes
app.get('/home', clientController.getClientView);
app.get('/booking', clientController.getClientBooking);
app.post('/booking', clientController.postAddClientBooking);

// admin dashboard routes
app.get('/', ensureAuthenticated, dashboardController.getDashboard);

// user routes
app.use('/users', userRoutes);

// service routes
app.use('/services', ensureAuthenticated, serviceRoutes);

// tool routes
app.use('/tools', ensureAuthenticated, toolRoutes);

// part routes
app.use('/parts', ensureAuthenticated, partRoutes);

// nfc routes
app.use('/nfc', nfcRoutes);

// 404 page
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page not found' });
});
