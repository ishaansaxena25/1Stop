const User = require("../models/user");
const RedeemHistoryModel = require("../models/redeemHistory");

async function createUser(req, res) {
  const { name, phone } = req.body;
  try {
    const newUser = new User({
      name,
      phone,
    });
    const savedUser = await newUser.save();
    res.status(201).json({ message: "User created successfully", savedUser });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  }
}

async function getUser(req, res) {
  const uid = req.headers["authorization"]?.split(" ")[1];
  try {
    const userDetails = await User.findById(uid);
    res.status(200).json({ userDetails });
  } catch (error) {
    res.status(500).json({ message: "ab aur nhi ho rha" });
  }
}

async function updatePoints(uid, responseBody) {
  const { points } = responseBody;
  const redeemHistory = await User.findByIdAndUpdate(uid, {
    $inc: { points: points },
  });
}
module.exports = { createUser, getUser, updatePoints };
