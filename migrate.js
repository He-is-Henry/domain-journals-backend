const mongoose = require("mongoose");
const { Accepted } = require("./model/AcceptedManuscripts");
const { Manuscript } = require("./model/Manuscript");

const addArticleType = async (collection) => {
  try {
    const docs = await collection.find();

    await Promise.all(
      docs.map(async (doc) => {
        if (!doc.articleType) {
          doc.articleType = "Editorial";
          await doc.save();
        }
      })
    );

    console.log(`Updated ${docs.length} documents in ${collection.modelName}`);
  } catch (err) {
    console.error(`Error updating ${collection.modelName}:`, err.message);
  }
};

module.exports = { addArticleType };
