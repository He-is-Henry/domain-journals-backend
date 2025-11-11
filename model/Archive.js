const mongoose = require("mongoose");
const schema = mongoose.Schema;

const archiveSchema = new schema({
  volume: { type: Number, required: true },
  issue: { type: Number, required: true },
  file: { type: String, required: true },
  journal: {
    type: String,
    enum: [
      "domain-health-journal",
      "domain-journal-of-science-and-technology",
      "domain-multidisciplinary-journal",
      "domain-journal-of-biological-sciences",
    ],
    required: true,
  },
});

module.exports = mongoose.model("archive", archiveSchema);
