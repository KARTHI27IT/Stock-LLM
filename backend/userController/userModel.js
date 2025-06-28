const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const assetSchema = new Schema({
  assetName: { type: String },
  assetType: { type: String },
  investedValue: { type: String },
  currentValue: { type: String }
});

const reportSchema = new Schema({
  reportName: { type: String },
  reportData: { type: String },
  reportPdf: { type: String },
  assets: [assetSchema]  
});

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  reports: [reportSchema]
});

const userSchemaModel = mongoose.model('user', userSchema);

module.exports = {
  userSchemaModel
};
