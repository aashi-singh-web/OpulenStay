const express= require('express');
const app = express();

const mongoose = require('mongoose');
const Listing = require('./models/listing'); // Importing the Listing model


// setting up the database
const mongo_url = 'mongodb://127.0.0.1:27017/OpulenStay';
main()
 .then(() => {
    console.log('Connected to DB');
 }).catch(err => {
    console.error('Error connecting to MongoDB:', err); 
 });    

 async function main(){
   await mongoose.connect(mongo_url);
 };

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get("/test", async (req, res) => {
    let sampleListing = new Listing({
        title: "My new Villa",
        description: "A beautiful villa with a pool",
        price: 1200,
        location: "Calangute, Goa",
        country: "India",   
    });
    await sampleListing.save();
    console.log("Sample listing saved to the database");
    res.send("Sample listing saved to the database");
});


app.listen(8080, () => {
    console.log('Server is running on port 8080');
} );