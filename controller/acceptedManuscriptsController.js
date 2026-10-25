const { supabase } = require("../config/supabase");
const { Accepted } = require("../model/AcceptedManuscripts");
const Archive = require("../model/Archive");
const { Manuscript } = require("../model/Manuscript");
const sendMail = require("../uttils/sendMail");

const getManuscript = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Id is required" });
  const manuscript = await Accepted.findById(id);
  if (!manuscript) return res.json(404).json({ error: "Manuscript not found" });
  res.json(manuscript);
};

const getBySlug = async (req, res) => {
  const { slug } = req.params;

  if (!slug)
    return res.status(400).json({
      error: "Slug is required",
    });

  const manuscript = await Accepted.findOne({
    slug,
  });

  if (!manuscript)
    return res.status(404).json({
      error: "Invalid manuscript slug",
    });

  res.json(manuscript);
};

const getUserManuscript = async (req, res) => {
  const manuscripts = await Accepted.find({ authorId: req.userId }).sort({
    createdAt: -1,
  });
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

const publishManuscript = async (req, res) => {
  let { issue, id, journal, slug, content } = req.body;

  try {
    if (slug) {
      slug = sanitizeSlug(slug);
      const slugAlreadyExists = await Accepted.exists({
        slug,
        _id: { $ne: id },
      });
      if (slugAlreadyExists) {
        return res.status(409).json({
          error: "Another manuscript is already using this slug.",
        });
      }
    }
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
      slug,
      content,
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
    const manuscripts = await Accepted.find(query).sort({ createdAt: -1 });
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
      .sort({ createdAt: -1 })
      .limit(3);
    res.json(recentManuscripts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
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
  let { customId, slug } = req.body;

  try {
    if (customId) {
      const idAlreadyExists = await Accepted.exists({
        customId,
        _id: { $ne: id },
      });
      if (idAlreadyExists) {
        return res.status(409).json({
          error:
            "Another manuscript is already using this ID. Please choose a different one.",
        });
      }
    }

    if (slug) {
      slug = sanitizeSlug(slug);
      const slugAlreadyExists = await Accepted.exists({
        slug,
        _id: { $ne: id },
      });
      if (slugAlreadyExists) {
        return res.status(409).json({
          error: "Another manuscript is already using this slug.",
        });
      }
    }

    const updateData = {};
    const allowedFields = [
      "title",
      "author",
      "email",
      "coAuthors",
      "journal",
      "issue",
      "year",
      "articleType",
      "abstract",
      "country",
      "file",
      "customId",
      "slug",
      "content",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = updateData[field] =
          field === "slug" ? slug : req.body[field];
      }
    });

    const updated = await Accepted.findByIdAndUpdate(
      id,
      { $set: updateData },
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

// utils

const createdAcceptedManuscript = async (
  manuscript,
  journal,
  issue,
  slug,
  content,
) => {
  const customId = await getManuscriptId(manuscript.journal);
  const accepted = new Accepted({
    _id: manuscript._id,
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
    slug,
    content,
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

        <p>You can view your published article here: 
          <a href="${process.env.FRONTEND_URL}/articles/${accepted.slug}" target="_blank">
            ${process.env.FRONTEND_URL}/articles/${accepted.slug}
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

  if (coAuthors.length > 0) {
    await sendMail({
      to: "ese.anibor.domainjournals.com",
      bcc: coAuthors.map((c) => c.email),
      subject: `Your manuscript "${accepted.title}" has been published`,
      html: generateHtml(false),
    });
  }
};

const sanitizeSlug = (str) => {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid characters (keep only alphanumeric, space, hyphen)
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with single hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
};

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
  const prefix = `${initials}-${currentYear}-`;

  const docs = await Accepted.find({
    journal,
    customId: { $regex: `^${prefix}` },
  }).select("customId");

  let maxCount = 0;

  docs.forEach((doc) => {
    if (doc.customId) {
      const parts = doc.customId.split("-");
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxCount) {
          maxCount = num;
        }
      }
    }
  });

  const nextCount = maxCount + 1;
  const padded = nextCount.toString().padStart(3, "0");
  return `${prefix}${padded}`;
};

module.exports = {
  getByIssue,
  getArchive,
  getBySlug,
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
