const axios = require("axios");

const responseType = "json"; // or xml
const BASE_URL = `https://maps.googleapis.com/maps/api/distancematrix/${responseType}`;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

async function calcMetroFare(req, res) {
  // console.log(req.query);
  console.log("calcmetrofare");
  // console.log(GOOGLE_API_KEY);

  const { origin, destination, transit_mode } = req.query; //deconstruct req.query to obtain origin and destination coords given by user
  console.log(req.query);
  //todo get transit type from user, so that fucntion can be used for both bus and rail(metro)
  try {
    console.log("fetching distance");

    const response = await axios
      .get(BASE_URL, {
        params: {
          origins: origin,
          destinations: destination,
          mode: "transit", //we wont be using any other mode of transport
          transit_mode: transit_mode, //rail for metro and ig bus for bus not sure
          key: GOOGLE_API_KEY,
        },
      })
      .then(console.log("req bhej diya"));
    const data = response.data;
    if (data.status === "OK") {
      const distance = data.rows[0].elements[0].distance.value; //in meters
      const duration = data.rows[0].elements[0].duration.value; //in seconds
      // console.log(distance, " ", duration);
      const fare = calcFare(distance);
      res.status(200).json({
        fare: fare,
        distance: distance,
        duration: duration,
        message: "yay",
      });
      //TODO-proper responses and better error handling
      //----------------------------------
      //   I AM HUNGRY BYE
      //----------------------------------
    }
  } catch (err) {
    console.error("error while calculating distance\n", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
}

function calcFare(distance) {
  if (distance >= 0 && distance <= 2000) {
    return 10.0;
  } else if (distance <= 4000) {
    return 20.0;
  } else if (distance <= 6000) {
    return 30.0;
  } else if (distance <= 8000) {
    return 40.0;
  } else if (distance <= 10000) {
    return 50.0;
  } else if (distance <= 12000) {
    return 60.0;
  } else if (distance <= 20000) {
    return 70.0;
  } else if (distance <= 25000) {
    return 80.0;
  } else {
    return 90.0;
  }
}

module.exports = { calcMetroFare };
