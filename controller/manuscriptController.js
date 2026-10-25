const { Manuscript } = require("../model/Manuscript");
const { Accepted } = require("../model/AcceptedManuscripts");
const sendMail = require("../uttils/sendMail");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Branded HTML Email Wrapper
const buildEmailTemplate = ({ title, contentHtml }) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f8f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1b5e20;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f8f4; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(9, 50, 56, 0.12); box-shadow: 0 4px 12px rgba(9, 50, 56, 0.08);">
              <!-- Header -->
              <tr>
                <td style="background-color: #093238; padding: 24px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">
                    Domain Journals
                  </h1>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 32px 28px; line-height: 1.6; color: #093238; font-size: 15px;">
                  ${contentHtml}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f7faf8; padding: 18px 28px; text-align: center; font-size: 12px; color: #3a5c43; border-top: 1px solid rgba(9, 50, 56, 0.08);">
                  <p style="margin: 0 0 4px 0; font-weight: 600;">Domain Journals Editorial Office</p>
                  <p style="margin: 0;">© ${new Date().getFullYear()} Domain Journals. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

// Helper for CC Notice string
const getCcNotice = (isMainAuthor, authorName, authorEmail, coAuthors = []) => {
  if (isMainAuthor) return "";
  const ccList = coAuthors
    .map((c) => (c.name ? `"${c.name}" ` : "") + `<${c.email}>`)
    .join(", ");
  return `
    <p style="font-size: 12px; color: #555; background-color: #e8f5e9; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px;">
      You are receiving a CC copy of an email sent to <strong>${authorName}</strong> &lt;${authorEmail}&gt;.<br/>
      <strong>CC:</strong> ${ccList || "None"}
    </p>
  `;
};

// 1. GET user manuscripts
const getUserManuscript = async (req, res) => {
  try {
    const manuscripts = await Manuscript.find({ authorId: req.userId }).sort({
      createdAt: -1,
    });
    return res.json(manuscripts);
  } catch (error) {
    console.error("getUserManuscript error:", error);
    return res.status(500).json({ error: "Failed to fetch manuscripts" });
  }
};

// 2. POST add manuscript
const addManuscript = async (req, res) => {
  const manuscript = req.body;

  if (!manuscript || Object.keys(manuscript).length === 0) {
    return res.status(400).json({ error: "A manuscript is required" });
  }

  manuscript.authorId = req.userId;
  const coAuthors = Array.isArray(manuscript.coAuthors)
    ? manuscript.coAuthors
    : [];
  const coAuthorEmails = coAuthors.map((c) => c.email).filter(Boolean);

  try {
    const result = await Manuscript.create(manuscript);

    const generateHtml = (isMainAuthor) => {
      const ccNotice = getCcNotice(
        isMainAuthor,
        manuscript.author,
        manuscript.email,
        coAuthors,
      );

      const content = `
        ${ccNotice}
        <h2 style="color: #093238; font-size: 18px; margin-top: 0; margin-bottom: 16px;">
          📄 Manuscript Submission Received
        </h2>
        <p>Hi <strong>${manuscript.author}</strong>,</p>
        <p>Your manuscript titled "<em>${manuscript.title}</em>" submitted to <strong>${manuscript.journal}</strong> has been successfully received.</p>
        <p>You can manage your submission, view updates, or make changes directly from your Author Dashboard.</p>

        <div style="margin: 28px 0; text-align: center; display: flex; gap: 12px; justify-content: center;">
          <a href="${process.env.FRONTEND_URL}/author" style="background-color: #659377; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Go to Author Dashboard
          </a>
          <a href="${process.env.FRONTEND_URL}/status/${result._id}" style="background-color: #0288d1; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            🔍 Track Status
          </a>
        </div>
      `;

      return buildEmailTemplate({
        title: "Manuscript Submission Received",
        contentHtml: content,
      });
    };

    await sendMail({
      to: manuscript.email,
      subject: "✅ Manuscript Submission Received - Domain Journals",
      html: generateHtml(true),
    });

    if (coAuthorEmails.length > 0) {
      await sendMail({
        to: "ese.anibor@domainjournals.com",
        bcc: coAuthorEmails,
        subject: "✅ Manuscript Submission Received - Domain Journals",
        html: generateHtml(false),
      });
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("addManuscript error:", error);
    return res.status(500).json({ error: "Failed to submit manuscript" });
  }
};

// 3. GET manuscript by payment reference
const getManuscriptByReference = async (req, res) => {
  const { paymentReference } = req.params;
  try {
    const manuscript = await Manuscript.findOne({ paymentReference });

    if (!manuscript) {
      return res
        .status(404)
        .json({ error: "No manuscript found for this reference." });
    }

    return res.json(manuscript);
  } catch (error) {
    console.error("getManuscriptByReference error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// 4. GET all manuscripts (Admin / Editor filter)
const getAllManuscripts = async (req, res) => {
  try {
    const manuscripts =
      req.role === "editor"
        ? await Manuscript.find({
            journal: req.access,
            status: { $ne: "screening" },
          })
        : await Manuscript.find();

    const journalsCollection = mongoose.connection.db.collection("journals");

    const fullManuscriptDetails = await Promise.all(
      manuscripts.map(async (manuscript) => {
        const item = manuscript.toObject();
        const journalDoc = await journalsCollection.findOne({
          name: item.journal,
        });
        item.issue = journalDoc?.issue || null;
        return item;
      }),
    );

    return res.json(fullManuscriptDetails.reverse());
  } catch (err) {
    console.error("Error getting manuscripts:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// 5. GET single manuscript by ID
const getManuscript = async (req, res) => {
  const { id } = req.params;
  try {
    let manuscript = await Manuscript.findById(id);
    if (manuscript) {
      return res.json(manuscript);
    }

    const published = await Accepted.findById(id);
    if (published) {
      const item = published.toObject();
      item.status = "published";
      return res.json(item);
    }

    return res.status(404).json({ error: "Manuscript not found" });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid manuscript ID format" });
    }
    return res.status(500).json({ error: "Server error" });
  }
};

// 6. GET manuscript by token
const getManuscriptByToken = async (req, res) => {
  const { token } = req.params;
  try {
    if (!token) return res.status(400).json({ error: "Token is required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.id;

    if (!id) return res.status(404).json({ error: "ID not found" });

    const manuscript = await Manuscript.findById(id);
    if (!manuscript) {
      return res.status(404).json({ error: "Manuscript not found or deleted" });
    }

    return res.json(manuscript);
  } catch (error) {
    console.error("getManuscriptByToken error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// 7. EDIT manuscript (Supports both Token & Authenticated Owner ID)
const editManuscript = async (req, res) => {
  const { id, token } = req.params;
  const details = req.body || {};

  // Strip immutable & protected fields
  delete details.status;
  delete details._id;
  delete details.authorId;
  // Restriction 1: Strip status to prevent authors from changing their status
  delete details.status;

  try {
    let manuscriptId = id;

    // Fallback if accessed via legacy token
    if (!manuscriptId && token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      manuscriptId = decoded.id;
    }

    if (!manuscriptId) {
      return res.status(400).json({ error: "Manuscript ID is required" });
    }

    const manuscript = await Manuscript.findById(manuscriptId);
    if (!manuscript) {
      return res.status(404).json({ error: "Manuscript not found" });
    }

    // Restriction 2: Status check — Paid or Published manuscripts cannot be edited by the author
    if (["paid", "published"].includes(manuscript.status)) {
      return res.status(400).json({
        error: `Manuscripts with status '${manuscript.status}' cannot be edited.`,
      });
    }

    // Restriction 3: Ownership check
    if (
      req.userId &&
      manuscript.authorId &&
      manuscript.authorId.toString() !== req.userId.toString()
    ) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this manuscript" });
    }

    Object.assign(manuscript, details);
    const updated = await manuscript.save();

    return res.json(updated);
  } catch (err) {
    console.error("editManuscript error:", err);
    return res.status(500).json({ error: "Failed to update manuscript" });
  }
};

// 8. EDIT manuscript file (Editor / Admin route)
const editManuscriptFile = async (req, res) => {
  const { id } = req.params;
  const { file } = req.body;

  if (!id) return res.status(400).json({ error: "ID is required" });

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    if (req.role === "editor" && manuscript.journal !== req.access) {
      return res
        .status(401)
        .json({ error: "Not allowed to edit files for this journal" });
    }

    manuscript.file = file;
    manuscript.edited = true;
    const result = await manuscript.save();
    return res.json(result);
  } catch (err) {
    console.error("editManuscriptFile error:", err);
    return res.status(500).json({ error: "Failed to update manuscript file" });
  }
};

// 9: Delete Manuscript (Protected Route with Status Guard)
const deleteManuscript = async (req, res) => {
  const { id, token } = req.params;

  try {
    let manuscriptId = id;

    if (!manuscriptId && token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      manuscriptId = decoded.id;
    }

    if (!manuscriptId) {
      return res.status(400).json({ error: "Manuscript ID is required" });
    }

    const manuscript = await Manuscript.findById(manuscriptId);
    if (!manuscript) {
      return res.status(404).json({ error: "Manuscript not found" });
    }

    // Restriction: Cannot delete published manuscripts
    if (manuscript.status === "published") {
      return res
        .status(400)
        .json({ error: "Published manuscripts cannot be deleted." });
    }

    // Ownership check
    if (
      req.userId &&
      manuscript.authorId &&
      manuscript.authorId.toString() !== req.userId.toString()
    ) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this manuscript" });
    }

    await manuscript.deleteOne();
    return res.json({
      message: "Manuscript deleted successfully",
      id: manuscriptId,
    });
  } catch (error) {
    console.error("deleteManuscript error:", error);
    return res.status(500).json({ error: "Failed to delete manuscript" });
  }
};

// 10. DELETE manuscript by Admin
const deleteManuscriptByAdmin = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "ID is required" });

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Could not find manuscript" });

    if (req.role === "editor" && manuscript.journal !== req.access) {
      return res
        .status(401)
        .json({ error: "Not allowed to delete manuscripts from this journal" });
    }

    const result = await manuscript.deleteOne();
    return res.json(result);
  } catch (error) {
    console.error("deleteManuscriptByAdmin error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// 11. Handle Screening -> Under Review
const handleManuscriptScreened = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    if (req.role !== "admin") {
      return res.status(401).json({ error: "Not allowed to screen a journal" });
    }

    manuscript.status = "under-review";
    const result = await manuscript.save();
    return res.json(result);
  } catch (err) {
    console.error("handleManuscriptScreened error:", err);
    return res.status(500).json({ error: "Screening failed" });
  }
};

// 12. Approve Manuscript
const approveManuscript = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    if (req.role === "editor" && manuscript.journal !== req.access) {
      return res
        .status(401)
        .json({ error: "Not allowed to access this journal" });
    }

    manuscript.status = "approved";
    await manuscript.save();

    const paymentLink = `${process.env.FRONTEND_URL}/pay/${manuscript._id}`;
    const coAuthors = manuscript.coAuthors || [];
    const coAuthorEmails = coAuthors.map((c) => c.email).filter(Boolean);

    const generateHtml = (isMainAuthor) => {
      const ccNotice = getCcNotice(
        isMainAuthor,
        manuscript.author,
        manuscript.email,
        coAuthors,
      );

      const content = `
        ${ccNotice}
        <h2 style="color: #093238; font-size: 18px; margin-top: 0; margin-bottom: 16px;">
          🎉 Manuscript Approved for Publication
        </h2>
        <p>Hi <strong>${manuscript.author}</strong>,</p>
        <p>Your manuscript titled "<em>${manuscript.title}</em>" has been <strong>approved</strong> for publication in <strong>${manuscript.journal}</strong>.</p>
        <p>Please complete your publication fee payment to proceed with layout editing and publishing.</p>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${paymentLink}" style="background-color: #659377; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Pay Publication Fee Now
          </a>
        </div>

        <p>If you have any questions, reply directly to this email.</p>
      `;

      return buildEmailTemplate({
        title: "Manuscript Approved",
        contentHtml: content,
      });
    };

    await sendMail({
      to: manuscript.email,
      subject: "Your Manuscript Has Been Approved – Complete Payment",
      html: generateHtml(true),
    });

    if (coAuthorEmails.length > 0) {
      await sendMail({
        to: "ese.anibor@domainjournals.com",
        bcc: coAuthorEmails,
        subject: "Your Manuscript Has Been Approved – Complete Payment",
        html: generateHtml(false),
      });
    }

    return res
      .status(200)
      .json({ message: "Manuscript approved and email sent." });
  } catch (err) {
    console.error("approveManuscript error:", err);
    return res.status(500).json({ error: "Approval failed" });
  }
};

// 13. Set Manuscript to Paid
const handleManuscriptPaid = async (req, res) => {
  const { id } = req.params;
  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    manuscript.status = "paid";
    const result = await manuscript.save();
    return res.json(result);
  } catch (err) {
    console.error("handleManuscriptPaid error:", err);
    return res.status(500).json({ error: "Failed to set status to paid" });
  }
};

// 14. Reject Manuscript
const rejectManuscript = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    const coAuthors = manuscript.coAuthors || [];
    const coAuthorEmails = coAuthors.map((c) => c.email).filter(Boolean);

    manuscript.status = "rejected";
    manuscript.comment = comment || "No reason provided";
    manuscript.rejectedBy = req.name || "Editorial Board";
    await manuscript.save();

    const generateHtml = (isMainAuthor) => {
      const ccNotice = getCcNotice(
        isMainAuthor,
        manuscript.author,
        manuscript.email,
        coAuthors,
      );

      const content = `
        ${ccNotice}
        <h2 style="color: #093238; font-size: 18px; margin-top: 0; margin-bottom: 16px;">
          Manuscript Decision Notification
        </h2>
        <p>Dear <strong>${manuscript.author}</strong>,</p>
        <p>Thank you for submitting your manuscript titled "<em>${manuscript.title}</em>" to <strong>${manuscript.journal}</strong>.</p>
        <p>After careful editorial review, we regret to inform you that your manuscript was not accepted for publication.</p>

        <p><strong>Reason for decision:</strong></p>
        <blockquote style="border-left: 4px solid #c62828; margin: 12px 0; padding: 12px 16px; background-color: #fdf2f2; color: #c62828;">
          ${comment || "No specific reason provided."}
        </blockquote>

        <p>We appreciate your interest in Domain Journals and wish you success in finding a suitable outlet for your work.</p>
      `;

      return buildEmailTemplate({
        title: "Manuscript Decision Notification",
        contentHtml: content,
      });
    };

    await sendMail({
      to: manuscript.email,
      subject: "Manuscript Submission – Decision Notification",
      html: generateHtml(true),
    });

    if (coAuthorEmails.length > 0) {
      await sendMail({
        to: "ese.anibor@domainjournals.com",
        bcc: coAuthorEmails,
        subject: "Manuscript Submission – Decision Notification",
        html: generateHtml(false),
      });
    }

    return res
      .status(200)
      .json({ message: "Manuscript rejected and decision email sent." });
  } catch (err) {
    console.error("rejectManuscript error:", err);
    return res.status(500).json({ error: "Rejection failed." });
  }
};

// 15. Revoke Acceptance -> Revert to Under Review
const revokeAcceptance = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    if (manuscript.status === "paid") {
      return res
        .status(400)
        .json({ error: "You cannot revert a paid manuscript" });
    }

    manuscript.status = "under-review";
    await manuscript.save();

    return res.json({ message: "Manuscript reverted to under-review." });
  } catch (err) {
    console.error("revokeAcceptance error:", err);
    return res.status(500).json({ error: "Failed to revoke acceptance." });
  }
};

// 16. Send Payment Reminder Email
const sendReminderEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    if (manuscript.status !== "approved") {
      return res.status(400).json({
        error: "Only approved manuscripts can receive payment reminders.",
      });
    }

    const paymentLink = `${process.env.FRONTEND_URL}/pay/${manuscript._id}`;
    const coAuthors = manuscript.coAuthors || [];
    const coAuthorEmails = coAuthors.map((c) => c.email).filter(Boolean);

    const generateHtml = (isMainAuthor) => {
      const ccNotice = getCcNotice(
        isMainAuthor,
        manuscript.author,
        manuscript.email,
        coAuthors,
      );

      const content = `
        ${ccNotice}
        <h2 style="color: #093238; font-size: 18px; margin-top: 0; margin-bottom: 16px;">
          Reminder: Complete Publication Fee Payment
        </h2>
        <p>Hi <strong>${manuscript.author}</strong>,</p>
        <p>This is a friendly reminder to complete the publication fee payment for your approved manuscript titled "<em>${manuscript.title}</em>".</p>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${paymentLink}" style="background-color: #f57c00; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Complete Payment Now
          </a>
        </div>

        <p>If you have already processed payment, please reply with proof of transaction.</p>
      `;

      return buildEmailTemplate({
        title: "Payment Reminder",
        contentHtml: content,
      });
    };

    await sendMail({
      to: manuscript.email,
      subject: "Reminder: Complete Your Manuscript Payment - Domain Journals",
      html: generateHtml(true),
    });

    if (coAuthorEmails.length > 0) {
      await sendMail({
        to: "ese.anibor@domainjournals.com",
        bcc: coAuthorEmails,
        subject: "Reminder: Complete Your Manuscript Payment - Domain Journals",
        html: generateHtml(false),
      });
    }

    return res.status(200).json({ message: "Reminder email sent." });
  } catch (err) {
    console.error("sendReminderEmail error:", err);
    return res.status(500).json({ error: "Failed to send reminder email" });
  }
};

module.exports = {
  getUserManuscript,
  addManuscript,
  handleManuscriptPaid,
  editManuscript,
  editManuscriptFile,
  deleteManuscript,
  getManuscript,
  getAllManuscripts,
  approveManuscript,
  rejectManuscript,
  getManuscriptByReference,
  revokeAcceptance,
  sendReminderEmail,
  getManuscriptByToken,
  deleteManuscriptByAdmin,
  handleManuscriptScreened,
};
