const { supabase } = require("../config/supabase");
const { Accepted } = require("../model/AcceptedManuscripts");
const Archive = require("../model/Archive");
const { Manuscript } = require("../model/Manuscript");
const sendMail = require("../uttils/sendMail");

function getInitials(slug) {
  return slug
    .split("-")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const getManuscriptId = async (journal) => {
  const currentYear = new Date().getFullYear();
  const initials = getInitials(journal);

  const latest = await Accepted.findOne({ journal }).sort({ _id: -1 });

  let count = 1;

  if (latest?.customId) {
    const parts = latest.customId.split("-");
    if (
      parts.length === 3 &&
      parts[0] === initials &&
      +parts[1] === currentYear
    ) {
      count = parseInt(parts[2], 10) + 1;
    }
  }

  const padded = count.toString().padStart(3, "0");
  return `${initials}-${currentYear}-${padded}`;
};

const getPublishPreview = async (req, res) => {
  try {
    const { journal } = req.params;
    const id = await getManuscriptId(journal);
    res.json(id);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate custom ID" });
  }
};

const getUserManuscript = async (req, res) => {
  const manuscripts = await Accepted.find({ authorId: req.userId });
  res.json(manuscripts);
};

const getByIssue = async (req, res) => {
  const { name, issue } = req.params;
  console.log(name, issue);
  const latestDoc = await Accepted.findOne({ journal: name })
    .sort({
      year: -1,
    })
    .select("year");
  const latestYear = latestDoc?.year;

  const currentIssue = await Accepted.find({
    journal: name,
    issue,
    year: latestYear,
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
  const manuscripts = await Accepted.find({ journal: name });
  const archiveList = await Archive.find({ journal: name }).lean();
  const archive = archiveList.map((a) => ({
    ...a,
    fileUrl: a.file?.startsWith("http")
      ? a.file
      : supabase.storage.from("archive").getPublicUrl(a.file).data.publicUrl,
  }));
  res.json({ manuscripts, archive });
};

const createdAcceptedManuscript = async (manuscript, journal, issue) => {
  const customId = await getManuscriptId(manuscript.journal);
  const accepted = new Accepted({
    coAuthors: manuscript.coAuthors,
    customId,
    authorId: manuscript.authorId,
    author: manuscript.author,
    email: manuscript.email,
    title: manuscript.title,
    journal,
    abstract: manuscript.abstract,
    file: manuscript.file,
    country: manuscript.country,
    paymentReference: manuscript.paymentReference,
    articleType: manuscript.articleType,
    issue,
  });

  await manuscript.deleteOne();
  return await accepted.save();
};

const sendAcceptedMail = async (accepted) => {
  const coAuthors = accepted.coAuthors || [];

  const generateHtml = (isMainAuthor) => {
    const ccNotice = isMainAuthor
      ? ""
      : `<p>You are being carbon copied ("cc:'d") on an e-mail "To" "${
          accepted.author
        }" &lt;${accepted.email}&gt;<br/>
  CC: ${accepted.coAuthors
    .map((c) => (c.name ? `"${c.name}" ` : "") + c.email)
    .join(", ")}
  </p><br/>`;

    return `
        ${ccNotice}
        <p>Dear ${accepted.author},</p>
        <p>We are pleased to inform you that your manuscript titled:</p>
        <blockquote>${accepted.title}</blockquote>
        <p>has been successfully <strong>published</strong> in the current issue.</p>

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
    to: accepted.email,
    subject: `Your manuscript "${accepted.title}" has been published`,
    html: generateHtml(true),
  });

  await sendMail({
    to: "ese.anibor.domainjournals.com",
    bcc: coAuthors,
    subject: `Your manuscript "${accepted.title}" has been published`,
    html: generateHtml(false),
  });
};

const publishManuscript = async (req, res) => {
  const { issue, id, journal } = req.body;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });
    if (!manuscript.edited)
      return res
        .status(409)
        .json({ error: "Manuscript needs re-upload before publish" });

    const accepted = await createdAcceptedManuscript(
      manuscript,
      journal,
      issue,
    );

    await sendAcceptedMail(accepted);

    res.status(201).json({
      message: "Manuscript published and all authors notified.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to publish manuscript" });
  }
};

const getAllAcceptedManuscripts = async (req, res) => {
  const { journal } = req.query;

  const query = journal ? { journal } : {};

  try {
    const manuscripts = await Accepted.find(query);
    console.log({ manuscripts });
    res.json(manuscripts);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const getRecentManuscripts = async (req, res) => {
  const { journal } = req.query;
  try {
    const query = journal ? { journal } : {};
    console.log(journal ? { journal } : {});
    const recentManuscripts = await Accepted.find(query)
      .sort({ _id: -1 })
      .limit(3);
    res.json(recentManuscripts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const adminUploadManuscript = async (req, res) => {
  const {
    author,
    coAuthors,
    email,
    title,
    journal,
    year,
    articleType,
    abstract,
    file,
    country,
    issue,
  } = req.body;

  try {
    const manuscript = await Manuscript.create({
      author,
      coAuthors,
      email,
      title,
      journal,
      year,
      articleType,
      abstract,
      file,
      country,
      issue,
      status: "approved",
    });

    const accepted = await createdAcceptedManuscript(
      manuscript,
      journal,
      issue,
    );

    await sendAcceptedMail(accepted);

    res.status(201).json({
      message: "Manuscript published and all authors notified.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to publish manuscript" });
  }
};

// Update an accepted manuscript
const updateAcceptedManuscript = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    author,
    email,
    coAuthors,
    journal,
    issue,
    year,
    articleType,
    abstract,
    country,
    file,
  } = req.body;

  try {
    const updated = await Accepted.findByIdAndUpdate(
      id,
      {
        $set: {
          title,
          author,
          email,
          coAuthors,
          journal,
          issue,
          year,
          articleType,
          abstract,
          country,
          file,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return res.status(404).json({ error: "Accepted manuscript not found" });
    }

    res.json({
      message: "Manuscript updated successfully",
      manuscript: updated,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update manuscript" });
  }
};

// Delete an accepted manuscript
const deleteAcceptedManuscript = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Accepted.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Accepted manuscript not found" });
    }

    res.json({ message: "Manuscript deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete manuscript" });
  }
};

module.exports = {
  getByIssue,
  getArchive,
  publishManuscript,
  getUserManuscript,
  getAllAcceptedManuscripts,
  getRecentManuscripts,
  getManuscript,
  getPublishPreview,
  adminUploadManuscript,
  updateAcceptedManuscript,
  deleteAcceptedManuscript,
};
