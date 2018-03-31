// init project
const express = require('express');
const app = express();

// Mongodb
const MongoClient = require('mongodb').MongoClient;
const db_url = process.env.SECRET;
const db_name = "url-shortener";

// init app
app.use(express.static('public'));


///    URL Shortener Service    ///
///////////////////////////////////

// Returns true if the given URL is valid
var validUrl = (url) => {
  var regex = /(?:http|https):\/\/[a-z.]+\.[a-z]{2,4}[a-z.]+/;
  return regex.test(url);
}

// Returns {URL, ID} pair given a URL or ID
var findUrl = (db, query, callback) => {
  var collection = db.collection("urls");
  
  collection.find(query).toArray((err, result) => {
    if (err) {
      callback({error: err}, false);
    }
    if (result && result[0]) {
      console.log(result);
      callback(false, {url: result[0].url, url_id: result[0].url_id});
    } else {
      callback({error: "{URL, ID} not found."}, false);
    }
  });
}

// Writes a {URL, ID} pair to our db
var writeUrl = (url, callback) => {

  // Open Connection Port for Mongo Client (this server)
  MongoClient.connect(db_url, (err, db) => {
    if(err) {
      callback({error: err});
      return;
    }
    
    // Have this url in DB?
    findUrl(db, {url: url}, (err, result) => {
      // Yes -> return {url, url_id} pair
      if(result) {
        return callback(result);
      }
      
      // No -> insert new {url, url_id} pair
      var collection = db.collection("urls");
      gen_url_id(db, (id)=> {
        
        // Insert new {url, url_id} pair in DB
        collection.insert({url:url, url_id: "" + id}, (err, result) => {
          if(err) {
            callback({error: "DB Write Error"});
          }
          if(result) {
            callback({old_url: url, short_url: 'https://url-squasher.glitch.me/' + id});
          } else {
            callback({error:"DB Write Error"});
          }
        });
      });
    });


  });
}

// Returns a unique url_id
var gen_url_id = (db, callback) => {
  var id = Math.floor(Math.random() * (10000 - 2)) + 1;
  console.log("try ID " + id + "...");
  findUrl(db, {url_id: id}, (err, result) => {
    if(result) {
      console.log("Bad ID.");
      return gen_url_id();
    } else {
      console.log("ID " + id + " Good.");
      return callback(id);
    }
  });
}

// Create a new URL entry in our DB
app.get("/new/:protocol//:name*", (req, res) => {
  var url = req.originalUrl.substring(5);
        
  if(!validUrl(url)) {
    res.status(400).json({error: "Invalid URL"});
    return;
  }
  
  writeUrl(url, (result) => {
    res.status(200).json(result);
  });
});

// Redirects user to matched url entry
app.get("/:url_id", (req, res) => {
  // On Glitch, we get favicon.io as req.params.url_id sometimes... Not sure why, but this fixes it!
  if(isNaN(req.params.url_id)) {
    res.status(400).json({error: "Invalid url_id"});
    return;
  }
  
  // Open Client connection port for Remote DB 
  MongoClient.connect(db_url, (err, db) => {
    if(err) {
      res.status(500).json({error: "DB connection error"});
      return;
    }
    
    findUrl(db, {url_id: req.params.url_id}, (err, result) => {
      if(err) {
        res.status(500).json({error: err});
      }
      else if(result) {
        res.status(200).redirect(result.url);
      } else {
        res.status(500).json({error: "result is falsy"});
      }
    });
  });
});

///    End URL Shortener Service    ///
///////////////////////////////////////


// Static html page to describe this microservice
app.get("/", (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Matches any non-defined route
app.get("*", (req, res) => {
  res.status(404).send("404 Page not found");
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`)
})
