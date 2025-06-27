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
    volume: Number(new Date().getFullYear() - 2024),
  });
  res.json(currentIssue);
};

const getManuscript = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Id is required" });
  const manuscript = await Accepted.findById(id);
  if (!manuscript) return res.json(404).json({ error: "Manuscript not found" });
  res.json(manuscript);
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
    if (!manuscript.edited)
      return res.josn({ error: "Manuscript needs re-upload before " });
    const accepted = new Accepted({
      coAuthors: manuscript.coAuthors,
      authorId: manuscript.authorId,
      author: manuscript.author,
      email: manuscript.email,
      title: manuscript.title,
      journal,
      abstract: manuscript.abstract,
      file: manuscript.file,
      country: manuscript.country,
      volume: manuscript.volume,
      paymentReference: manuscript.paymentReference,
      issue,
    });

    await accepted.save();
    await manuscript.deleteOne();

    const coAuthors = manuscript.coAuthors || [];

    const generateHtml = (isMainAuthor) => {
      const ccNotice = isMainAuthor
        ? ""
        : `<p>You are being carbon copied ("cc:'d") on an e-mail "To" "${
            manuscript.author
          }" &lt;${manuscript.email}&gt;<br/>
  CC: ${manuscript.coAuthors
    .map((c) => (c.name ? `"${c.name}" ` : "") + c.email)
    .join(", ")}
  </p><br/>`;

      return `
        ${ccNotice}
        <p>Dear ${manuscript.author},</p>
        <p>We are pleased to inform you that your manuscript titled:</p>
        <blockquote>${manuscript.title}</blockquote>
        <p>has been successfully <strong>published</strong> in the journal <strong>${accepted.journal}</strong>, Volume ${accepted.volume}, Issue ${accepted.issue}.</p>

        <p>You can view your published manuscript here: 
          <a href="${process.env.FRONTEND_URL}/journals/${accepted.journal}/current-issue" target="_blank">
            ${process.env.FRONTEND_URL}/journals/${accepted.journal}/current-issue
          </a>
        </p>

        <p>We’d love to hear your feedback. Kindly take a moment to share your experience with us:</p>
        <p>
          <a href="${process.env.FRONTEND_URL}/review" target="_blank" style="color: #2e7d32;">
            Submit a Review
          </a>
        </p>

        <br/>
        <p>Regards,<br/>Editorial Board</p>
      `;
    };

    await sendMail({
      to: manuscript.email,
      subject: `Your manuscript "${manuscript.title}" has been published`,
      html: generateHtml(true),
    });

    await sendMail({
      to: "domainjournals.dev@gmail.com",
      bcc: coAuthors,
      subject: `Your manuscript "${manuscript.title}" has been published`,
      html: generateHtml(false),
    });

    res.status(201).json({
      message: "Manuscript published and all authors notified.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to publish manuscript" });
  }
};

const getRecentManuscripts = async (req, res) => {
  try {
    const recentManuscripts = await Accepted.find().sort({ _id: -1 }).limit(3);
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
  getManuscript,
};
