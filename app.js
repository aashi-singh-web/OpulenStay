const express= require('express');
const app = express();

const mongoose = require('mongoose');

// setting up the database
const mongo_url = 'mongodb://localhost:27017/OpulenStay';
main()
 .then(() => {
    console.log('Connected to DB');
 }).catch(err => {
    console.error('Error connecting to MongoDB:', err); 
 });    

 async function main(){
   await mongoose.connect(mongo_url);
 }


app.get('/', (req, res) => {
    res.send('Hello World!');
});


app.listen(8080, () => {
    console.log('Server is running on port 3000');
} );