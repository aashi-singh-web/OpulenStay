if(process.env.NODE_ENV !== "production"){
    require("dotenv").config();
 }

console.log(process.env.SECRET);
const express= require('express');
const app = express();

const mongoose = require('mongoose');
const Listing = require('./models/listing'); // Importing the Listing model

const path= require('path');
const methodOverride= require("method-override");

const ejsMate = require("ejs-mate");
const wrapAsync = require('./utils/wrapAsync.js');
const ExpressError = require('./utils/ExpressError.js');


const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');

const Review = require('./models/review.js');
const { isLoggedIn, saveRedirectUrl, isOwner, validateListing,validateReview, isReviewAuthor } = require('./middleware.js');

// setting up the database
// const mongo_url = 'mongodb://127.0.0.1:27017/OpulenStay';

const dbUrl= process.env.ATLASDB_URL;

main()
 .then(() => {
    console.log('Connected to DB');
 }).catch(err => {
    console.error('Error connecting to MongoDB:', err); 
 });    

 async function main(){
   await mongoose.connect(dbUrl);
 };

 app.set('view engine', 'ejs'); 
 app.set('views', path.join(__dirname, 'views')); 
app.use(express.urlencoded({ extended: true })); 
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);

app.use(express.static(path.join(__dirname,"/public")));

const store= MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", function(e){
  console.log("SESSION STORE ERROR", e);
});

const sessionOptions = {
  store: store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now()+7*24*60*60*1000,
    maxAge: 7*24*60*60*1000,
    httpOnly: true,
  }
};

// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// configuring

app.use((req,res,next) => {
  res.locals.success= req.flash("success");
  res.locals.error= req.flash("error");
  res.locals.currUser= req.user;
  res.locals.searchQuery = req.query.search || '';
  res.locals.selectedCategory = req.query.category || '';
  next();
});


// app.get("/demouser", async(req, res) => {
//   let fakeUser = new User({
//     email: "student@gmail.com",
//     username: "student"
// });
//   let registeredUser= await User.register(fakeUser, "helloworld");
//   res.send(registeredUser);
// });


//Index Route
app.get("/listings", wrapAsync(async (req, res) => {
  let query = {};
  
  // Handle search query
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { location: { $regex: req.query.search, $options: 'i' } },
      { country: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Handle category filter
  if (req.query.category) {
    query.category = req.query.category;
  }
  
  const allListings = await Listing.find(query);
  res.render("listings/index.ejs", { allListings, searchQuery: req.query.search || '', selectedCategory: req.query.category || '' });
}));

//New Route
app.get("/listings/new", isLoggedIn,(req, res) => {

  res.render("listings/new.ejs");
});

//Show Route
app.get("/listings/:id", wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id).populate({path: 'reviews', populate: {path:"author"}
}).populate("owner");
  if(!listing){
    req.flash("error", "Listing does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
}));

//Create Route
app.post("/listings", isLoggedIn,validateListing, wrapAsync(async (req, res, next) => {
  const newListing = new Listing(req.body.listing);
  newListing.owner= req.user._id;
  await newListing.save();
  req.flash("success", "New listing created successfully!");
  res.redirect("/listings");
})
);

//Edit Route
app.get("/listings/:id/edit", isLoggedIn,isOwner, wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if(!listing){
    req.flash("error", "Listing does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/edit.ejs", { listing });
}));

//Update Route
app.put("/listings/:id",isLoggedIn,isOwner, validateListing, wrapAsync(async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  req.flash("success", "Listing updated successfully!");
  res.redirect(`/listings/${id}`);
}));

//Delete Route
app.delete("/listings/:id",isLoggedIn,isOwner, wrapAsync(async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing deleted successfully!");
  res.redirect("/listings");
})
);

//Reviews
//Post Route
app.post("/listings/:id/reviews", isLoggedIn,validateReview, wrapAsync(async (req, res)=> {
  let listing= await Listing.findById(req.params.id);

  let newReview= new Review(req.body.review);
  newReview.author= req.user._id;
  listing.reviews.push(newReview);
  await newReview.save();
  await listing.save();
  req.flash("success", "Review added successfully!");
res.redirect(`/listings/${listing._id}`);

}));

//Delete Review Route
app.delete("/listings/:id/reviews/:reviewId",isLoggedIn,isReviewAuthor, wrapAsync(async (req, res) => {
  let { id, reviewId } = req.params;
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);
  req.flash("success", "Review deleted successfully!");
  res.redirect(`/listings/${id}`);
}));

//user test route
app.get("/signup",(req,res)=>{
  res.render("./users/signup.ejs");
});

app.post("/signup", wrapAsync(async(req,res)=>{
  try{
  let {username, email, password} = req.body;
  const newUser = new User({username, email});
  const registeredUser= await User.register(newUser, password);
  
  req.login(registeredUser, err=>{
    if(err) {
      return next(err);
    }
    
  req.flash("success", "Welcome to OpulenStays!");
  
  res.redirect("/listings");
  })
  }catch(e) {
    req.flash("error", e.message);
    res.redirect("signup");

  }


}));

app.get("/login",(req,res)=>{
  res.render("./users/login.ejs");
});

app.post("/login",saveRedirectUrl, passport.authenticate("local", {
  failureFlash: true,
  failureRedirect: "/login"})
, async(req, res) => {
  req.flash("success", "Welcome back to OpulenStays!");
  let redirectUrl = res.locals.redirectUrl || '/listings';
  res.redirect(redirectUrl);
  // delete req.session.returnTo;

});

app.get("/logout", (req, res,next) => {
  req.logout((err) => {
    if (err) {
     return next(err);
    }
    req.flash("success", "Logged out successfully!");
    res.redirect("/listings");
  });
});


// app.get("/test", async (req, res) => {
//     let sampleListing = new Listing({
//         title: "My new Villa",
//         description: "A beautiful villa with a pool",
//         price: 1200,
//         location: "Calangute, Goa",
//         country: "India",   
//     });
//     await sampleListing.save();
//     console.log("Sample listing saved to the database");
//     res.send("Sample listing saved to the database");
// });


app.all('*', (req, res, next) => {
  next(new ExpressError(404, 'Page Not Found'));
});

app.use((err,req,res,next) => {
  let{ statusCode=500, message="Something went wrong!"}= err;
  res.status(statusCode).render("listings/error.ejs", {message});
  // res.status(statusCode).send(message);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
} );