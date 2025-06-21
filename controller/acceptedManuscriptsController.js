const { Accepted } = require("../model/AcceptedManuscripts");
const { Manuscript } = require("../model/Manuscript");
const sendMail = require("../uttils/sendMail");

const getUserManuscript = async (req, res) => {
  const manuscripts = await Accepted.find({ authorId: req.userId });
  res.json(manuscripts);
};
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
  const { issue, id, journal } = req.body;
  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    const accepted = new Accepted({
      authorId: manuscript.authorId,
      name: manuscript.name,
      email: manuscript.email,
      title: manuscript.title,
      journal,
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
  <p>has been successfully <strong>published</strong> in the journal <strong>${accepted.journal}</strong>, Volume ${accepted.volume}, Issue ${accepted.issue}.</p>

  <p>You can view your published manuscript here: 
    <a href="${process.env.FRONTEND_URL}/journals/${accepted.journal}/current-issue" target="_blank">
      ${process.env.FRONTEND_URL}/journals/${accepted.journal}/current-issue
    </a>
  </p>

  <p>We’d love to hear your feedback. Kindly take a moment to share your experience with us by submitting a brief review:</p>
  <p>
    <a href="${process.env.FRONTEND_URL}/review" target="_blank" style="color: #2e7d32;">
      Submit a Review
    </a>
  </p>

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

const getRecentManuscripts = async (req, res) => {
  try {
    const recentManuscripts = await Accepted.find().limit(20);
    console.log(recentManuscripts);
    res.json(recentManuscripts);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = {
  getByIssue,
  getArchive,
  publishManuscript,
  getUserManuscript,
  getRecentManuscripts,
};
