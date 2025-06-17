const { Accepted } = require("../model/AcceptedManuscripts");
const { Manuscript } = require("../model/Manuscript");
const sendMail = require("../uttils/sendMail");

const getByIssue = async (req, res) => {
  const { name, issue } = req.params;
  console.log(name, issue);
  const currentIssue = await Accepted.find({
    journal: name,
    issue,
    volume: Number(2026 - new Date().getFullYear()),
  });
  res.json(currentIssue);
};

const getArchive = async (req, res) => {
  const { name } = req.params;
  const archive = await Accepted.find({ journal: name });
  res.json(archive);
};

const publishManuscript = async (req, res) => {
  const { id } = req.params;
  const { issue } = req.body;
  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    const accepted = new Accepted({
      name: manuscript.name,
      email: manuscript.email,
      title: manuscript.title,
      journal: manuscript.journal,
      abstract: manuscript.abstract,
      file: manuscript.file,
      country: manuscript.country,
      volume: manuscript.volume,
      issue,
    });

    await accepted.save();

    await manuscript.deleteOne();

    await sendMail({
      to: manuscript.email,
      subject: `Your manuscript "${manuscript.title}" has been published`,
      html: `
        <p>Dear ${manuscript.name},</p>
        <p>We are pleased to inform you that your manuscript titled:</p>
        <blockquote>${manuscript.title}</blockquote>
        <p>has been successfully <strong>published</strong> in the journal <strong>${manuscript.journal}</strong>, Volume ${accepted.volume}, Issue ${accepted.issue}.</p>
        <p>Thank you for publishing with us!</p>
        <br />
        <p>Regards,<br />Editorial Board</p>
      `,
    });

    res
      .status(201)
      .json({ message: "Manuscript published and author notified." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to publish manuscript" });
  }
};
module.exports = { getByIssue, getArchive, publishManuscript };
