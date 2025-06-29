const { Accepted } = require("./model/AcceptedManuscripts");

// Helper to get initials from journal slug
function getInitials(slug) {
  return slug
    .split("-")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const countMap = {};

// Main function to generate ID
function getCustomId(journal) {
  const year = new Date().getFullYear();
  const key = `${journal}-${year}`;
  const initials = getInitials(journal);

  if (!countMap[key]) countMap[key] = 1;
  else countMap[key] += 1;

  const padded = String(countMap[key]).padStart(3, "0");
  return `${initials}-${year}-${padded}`;
}

// Run update script
async function addMissingCustomIds() {
  const all = await Accepted.find({});

  for (const doc of all) {
    if (!doc.customId) {
      const newId = getCustomId(doc.journal);
      doc.customId = newId;
      await doc.save({ validateBeforeSave: false });
      console.log(`✅ Updated: ${doc._id} → ${newId}`);
    }
  }

  console.log("Done ✅");
}

module.exports = addMissingCustomIds;
