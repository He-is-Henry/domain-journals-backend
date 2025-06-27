const { Manuscript } = require("../model/Manuscript");
const User = require("../model/User");
const sendMail = require("../uttils/sendMail");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const getUserManuscript = async (req, res) => {
  const manuscripts = await Manuscript.find({ authorId: req.userId });
  res.json(manuscripts);
};
const addManuscript = async (req, res) => {
  const manuscript = req?.body;
  console.log(req.body);

  if (!manuscript || Object.keys(manuscript).length === 0) {
    return res.status(400).json({ error: "A manuscript is required" });
  }
  manuscript.authorId = req.userId;
  const coAuthors = manuscript.coAuthors.map((c) => c.email);

  try {
    const result = await Manuscript.create(manuscript);
    console.log(result._id);

    const token = jwt.sign({ id: result._id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    const generateHtml = (isMainAuthor) => {
      const ccNotice = isMainAuthor
        ? ""
        : `<p>You are being carbon copied ("cc:'d") on an e-mail "To" "<strong>${
            manuscript.author
          }</strong>" &lt;${manuscript.email}&gt;<br/>
         CC: ${manuscript.coAuthors
           .map((c) => (c.name ? `"${c.name}" ` : "") + c.email)
           .join(", ")}
       </p><br/>`;

      return `
    ${ccNotice}
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
      <h2 style="color: #4CAF50;">📄 Manuscript Submission Received</h2>
      <p>Hi <strong>${manuscript.author}</strong>,</p>
      <p>Your manuscript titled "<em>${manuscript.title}</em>" submitted to 
      <strong>${manuscript.journal}</strong> has been successfully received.</p>
      <p>We’ll contact you with the outcome or next steps shortly.</p>
      <p>Thank you for submitting to <strong>Domain Journals</strong>.</p>
      <div style="margin-top: 30px; display: flex; flex-wrap: wrap; gap: 10px;">
        <a href="${process.env.FRONTEND_URL}/edit/${token}" 
           style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          ✏️ Edit Manuscript
        </a>
        <a href="${process.env.FRONTEND_URL}/delete/${token}" 
           style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          🗑️ Delete Manuscript
        </a>
        <a href="${process.env.FRONTEND_URL}/status/${result._id}" 
           style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          🔍 Check Status
        </a>
      </div>
      <p style="margin-top: 30px;"><strong style="color: red;">⚠️ Do not share this email with anyone!</strong></p>
    </div>
  `;
    };

    await sendMail({
      to: manuscript.email,
      subject: "✅ Manuscript Submission Received",
      text: `Your manuscript titled ${manuscript.title} has been received`,
      html: generateHtml(true),
    });

    await sendMail({
      to: "domainjournals.dev@gmail.com",
      bcc: coAuthors,
      subject: "✅ Manuscript Submission Received",
      html: generateHtml(false),
    });

    res.json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Failed to submit manuscript" });
  }
};

const getManuscriptByReference = async (req, res) => {
  const { paymentReference } = req.params;
  console.log(paymentReference);
  try {
    const manuscript = await Manuscript.findOne({ paymentReference });

    if (!manuscript) {
      return res
        .status(404)
        .json({ error: "No manuscript found for this reference." });
    }

    res.json(manuscript);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllManuscripts = async (req, res) => {
  try {
    const manuscripts =
      req.role === "editor"
        ? await Manuscript.find({
            journal: req.access,
            status: { $ne: "screening" },
          })
        : await Manuscript.find();

    console.log(req.role);
    console.log(req.access);

    const journals = mongoose.connection.db.collection("journals");

    const fullManuscriptDetails = await Promise.all(
      manuscripts.map(async (manuscript) => {
        manuscript = manuscript.toObject();
        manuscript.volume = new Date().getFullYear() - 2024;

        const journal = await journals.findOne({ name: manuscript.journal });
        manuscript.issue = journal?.issue || null;

        console.log(journal);

        return manuscript;
      })
    );

    res.json(fullManuscriptDetails.reverse());
  } catch (err) {
    console.error("Error getting manuscripts:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getManuscript = async (req, res) => {
  const { id } = req.params;
  const manuscript = await Manuscript.findById(id);
  if (!manuscript)
    return res.status(404).json({ error: "Manuscript not found or deleted" });
  res.json(manuscript);
};

const getManuscriptByToken = async (req, res) => {
  const { token } = req.params;
  try {
    if (!token) return res.status(400).json({ error: "Token is not defined" });

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.id;

    console.log(decoded);

    if (!id) return res.status(404).json({ error: "ID not found" });

    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found or deleted" });

    return res.json(manuscript);
  } catch (error) {
    console.log("getManuscriptByToken error:", error);
    return res.status(500).json({ error: error.message });
  }
};

const editManuscript = async (req, res) => {
  const { token } = req.params;
  if (!token) res.status(400).json({ error: "Token is not defined" });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const id = decoded.id;
  const details = req.body;
  const { status, ...otherDetails } = details;
  if (!details) res.status(400).json({ error: "Fields to edit are required" });

  try {
    const result = await Manuscript.findByIdAndUpdate(
      id,
      {
        $set: otherDetails,
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
const editManuscriptFile = async (req, res) => {
  const { id } = req.params;
  if (!id) res.status(400).json({ error: "ID is not defined" });
  const { file } = req.body;

  try {
    const manuscript = await Manuscript.findById(id);
    if (req.role === "editor" && manuscript.journal !== req.access)
      res
        .status(401)
        .json({ error: "Not allowed to access this edit this journal" });
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });
    manuscript.file = file;
    const result = await manuscript.save();
    res.json(result);
  } catch (err) {
    console.log(err);
  }
};

const deleteManuscript = async (req, res) => {
  const { token } = req.params;
  if (!token) res.status(400).json({ error: "Token is not defined" });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const id = decoded.id;
  if (!id) res.status(400).json({ error: "Id is not defined" });
  try {
    const result = await Manuscript.findByIdAndDelete(id);
    if (!result)
      return res
        .status(404)
        .json({ error: `Could not find manuscript with id ${id}` });
    res.json(result);
  } catch (error) {
    console.log(error);
  }
};
const deleteManuscriptByAdmin = async (req, res) => {
  const { id } = req.params;
  console.log(id);
  if (!id) return res.status(400).json({ error: "Id is not defined" });
  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Could not find manuscript" });
    console.log(manuscript);
    if (req.role === "editor" && manuscript.journal !== req.access)
      return res
        .status(401)
        .json({ error: "Not allowed to access this delete this journal" });
    const result = await manuscript.deleteOne();

    res.json(result);
  } catch (error) {
    console.log(error);
  }
};

const handleManuscriptScreened = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);

    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });
    if (req.role !== "admin")
      return res.status(401).json({ error: "Not allowed to screen a journal" });
    manuscript.status = "under-review";
    const result = manuscript.save();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Screening failed" });
  }
};

const approveManuscript = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    if (req.role === "editor" && manuscript.journal !== req.access)
      return res
        .status(401)
        .json({ error: "Not allowed to access this journal" });

    manuscript.status = "approved";
    await manuscript.save();

    const paymentLink = `${process.env.FRONTEND_URL}/pay/${manuscript._id}`;
    const coAuthors = manuscript.coAuthors || [];

    const generateHtml = (isMainAuthor) => {
      const ccNotice = isMainAuthor
        ? ""
        : `<p>You are being carbon copied ("cc:'d") on an e-mail "To" "<strong>${
            manuscript.author
          }</strong>" &lt;${manuscript.email}&gt;<br/>
             CC: ${coAuthors
               .map((c) => (c.name ? `"${c.name}" ` : "") + c.email)
               .join(", ")}
           </p><br/>`;

      return `
        ${ccNotice}
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <p>Hi <strong>${manuscript.author}</strong>,</p>
          <p>Your manuscript titled "<em>${manuscript.title}</em>" has been <strong>approved</strong> for publication.</p>
          <p>Please complete your publication fee payment to proceed.</p>
          <div style="margin-top: 20px;">
            <a href="${paymentLink}" 
              style="background-color: #4CAF50; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 5px;">
              Pay Now
            </a>
          </div>
          <p>If you have any questions, feel free to reply to this email.</p>
          <p><strong>Domain Journals</strong></p>
        </div>
      `;
    };

    // Send to main author
    await sendMail({
      to: manuscript.email,
      subject: "Your Manuscript Has Been Approved – Complete Payment",
      html: generateHtml(true),
    });

    await sendMail({
      to: "domainjournals.dev@gmail.com",
      bcc: coAuthors.map((c) => c.email),
      subject: "Your Manuscript Has Been Approved – Complete Payment",
      html: generateHtml(false),
    });

    res.status(200).json({ message: "Manuscript approved and email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Approval failed" });
  }
};

const handleManuscriptPaid = async (req, res) => {
  const { id } = req.params;
  const manuscript = await Manuscript.findById(id);
  if (!manuscript)
    return res.status(404).json({ error: "Manuscript not found" });

  manuscript.status = "paid";
  const result = await manuscript.save();
  res.json(result);
};
const rejectManuscript = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    const coAuthors = manuscript.coAuthors || [];

    manuscript.status = "rejected";
    manuscript.comment = comment || "No reason provided";
    const admin = await User.findById(req.userId);
    manuscript.rejectedBy = admin;
    await manuscript.save();

    const generateHtml = (isMainAuthor) => {
      const ccNotice = isMainAuthor
        ? ""
        : `<p>You are being carbon copied ("cc:'d") on an e-mail "To" "<strong>${
            manuscript.author
          }</strong>" &lt;${manuscript.email}&gt;<br/>
            CC: ${coAuthors
              .map((c) => (c.name ? `"${c.name}" ` : "") + c.email)
              .join(", ")}
           </p><br/>`;

      return `
        ${ccNotice}
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <p>Dear <strong>${manuscript.author}</strong>,</p>
          <p>Thank you for submitting your manuscript titled "<em>${
            manuscript.title
          }</em>" to <strong>${manuscript.journal}</strong>.</p>
          <p>After careful consideration, we regret to inform you that your manuscript was not accepted for publication.</p>
          <p><strong>Reason for rejection:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; margin: 10px 0; padding-left: 15px; color: #900;">
            ${comment || "No reason was provided."}
          </blockquote>
          <p>Please don't be discouraged — we appreciate the time and effort you've invested, and we hope you'll consider submitting future work to us.</p>
          <p>Sincerely,<br/>The Editorial Team<br/><strong>Domain Journals</strong></p>
        </div>
      `;
    };

    // Send to main author
    await sendMail({
      to: manuscript.email,
      subject: "Manuscript Submission – Decision Notification",
      html: generateHtml(true),
    });

    // Send to co-authors via BCC with notice
    await sendMail({
      to: "domainjournals.dev@gmail.com",
      bcc: coAuthors.map((c) => c.email),
      subject: "Manuscript Submission – Decision Notification",
      html: generateHtml(false),
    });

    res.status(200).json({ message: "Manuscript rejected and email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Rejection failed." });
  }
};

const revokeAcceptance = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (manuscript.status === "paid")
      return res.json({ error: "You cannot revert a paid manuscript" });
    if (!manuscript) return res.status(404).json({ message: "Not found" });

    manuscript.status = "under-review";
    await manuscript.save();

    res.json({ message: "Manuscript reverted to under-review." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to revoke acceptance." });
  }
};

const sendReminderEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript)
      return res.status(404).json({ error: "Manuscript not found" });

    if (manuscript.status !== "approved") {
      return res.status(400).json({
        error: "Only approved manuscripts can receive reminders.",
      });
    }

    const paymentLink = `${process.env.FRONTEND_URL}/pay/${manuscript._id}`;
    const coAuthors = manuscript.coAuthors || [];

    const generateHtml = (isMainAuthor) => {
      const ccNotice = isMainAuthor
        ? ""
        : `<p>You are being carbon copied ("cc:'d") on an e-mail "To" "<strong>${
            manuscript.author
          }</strong>" &lt;${manuscript.email}&gt;<br/>
             CC: ${coAuthors
               .map((c) => (c.name ? `"${c.name}" ` : "") + c.email)
               .join(", ")}
           </p><br/>`;

      return `
        ${ccNotice}
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <p>Hi <strong>${manuscript.author}</strong>,</p>
          <p>This is a friendly reminder to complete the payment for your manuscript titled "<em>${manuscript.title}</em>", which has already been <strong>approved</strong>.</p>
          <p>Please use the button below to make your payment:</p>
          <div style="margin-top: 20px;">
            <a href="${paymentLink}" 
              style="background-color: #f57c00; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 5px;">
              Pay Now
            </a>
          </div>
          <p>If you’ve already paid, please ignore this message or reply with proof of payment.</p>
          <p><strong>Domain Journals Team</strong></p>
        </div>
      `;
    };

    // Send to main author
    await sendMail({
      to: manuscript.email,
      subject: "Reminder: Complete Your Manuscript Payment",
      html: generateHtml(true),
    });

    // Send to co-authors with CC notice
    await sendMail({
      to: "domainjournals.dev@gmail.com",
      bcc: coAuthors.map((c) => c.email),
      subject: "Reminder: Complete Your Manuscript Payment",
      html: generateHtml(false),
    });

    res.status(200).json({ message: "Reminder email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send reminder email" });
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
