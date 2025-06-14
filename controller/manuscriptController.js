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
    const html = `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <p>Hi <strong>${manuscript.name}</strong>,</p>

    <p>
      Your manuscript titled "<em>${manuscript.title}</em>" submitted to 
      <strong>${manuscript.journal}</strong> has been received.
    </p>

    <p>We'll contact you with the outcome or next steps shortly.</p>

    <p>Thank you for submitting to <strong>Domain Journals</strong>.</p>

    <div style="margin-top: 30px;">
      <a href="${process.env.FRONTEND_URL}/edit/${result._id}" 
         style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px; margin-right: 10px; 
                display: inline-block;">
        Edit Manuscript
      </a>

      <a href="${process.env.FRONTEND_URL}/delete/${result._id}" 
         style="background-color: #f44336; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px; display: inline-block;">
        Delete Manuscript
      </a>
      <strong style="color: red;"> Do not share this email with anyone!!!</strong>
    </div>
  </div>
`;

    await sendMail({
      to: manuscript.email,
      subject: "manuscript received",
      text: `Hi ${manuscript.name}, your manuscript titled "${manuscript.title}" submitted to ${manuscript.journal} has been received.`,
      html,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

const getManuscript = async (req, res) => {
  const { id } = req.params;
  const manuscript = await Manuscript.findById(id);
  if (!manuscript)
    return res.status(404).json({ error: "Manuscript not found or deleted" });
  res.json(manuscript);
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

module.exports = {
  addManuscript,
  editManuscript,
  deleteManuscript,
  getManuscript,
};
