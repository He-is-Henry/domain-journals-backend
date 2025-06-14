const { Manuscript } = require("../model/Manuscript");
const sendMail = require("../uttils/sendMail");

const addManuscript = async (req, res) => {
  const manuscript = req?.body;
  console.log(req.body);
  if (!manuscript || Object.keys(manuscript).length === 0) {
    return res.status(400).json({ error: "A manuscript is required" });
  }
  try {
    const result = await Manuscript.create(manuscript);
    res.json(result);
    await sendMail({
      to: manuscript.email,
      subject: "manuscript received",
      text: `Hi ${manuscript.name}, your manuscript titled "${manuscript.title}" submitted to ${manuscript.journal} has been received.`,
      html: `
      <p>Hi <strong>${manuscript.name}</strong>,</p>
      <p>Your manuscript titled "<em>${manuscript.title}</em>" submitted to <strong>${manuscript.journal}</strong> has been received.</p>
      
      <p>We'll contact you with the outcome or next steps shortly.</p>
      <p>Thank you for submitting to Domain Journals.</p>
  `,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

const editManuscript = async (req, res) => {
  const { id } = req.params;
  if (!id) res.status(400).json({ error: "Id is not defined" });
  const details = req.body;
  if (!details) res.status(400).json({ error: "Fields to edit are required" });

  try {
    const result = await Manuscript.findByIdAndUpdate(
      id,
      {
        $set: details,
      },
      {
        $new: true,
      }
    );
    if (!result) res.status(404).json({ error: "Manuscript not found" });
    return res.json(result);
  } catch (err) {
    console.log(err);
  }
};

const deleteManuscript = async (req, res) => {
  const { id } = req.params;
  if (!id) res.status(400).json({ error: "Id is not defined" });
  try {
    const result = await Manuscript.findByIdAndDelete(id);
    res.json(result);
  } catch (error) {
    console.log(error);
  }
};

module.exports = { addManuscript, editManuscript, deleteManuscript };
