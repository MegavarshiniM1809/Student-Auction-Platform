const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    department: { type: String, required: true },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    contact: { type: String, default: '' },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    notificationPreference: {
      inApp: { type: Boolean, default: true },
      browser: { type: Boolean, default: false },
    },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

// Never return passwordHash
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

userSchema.methods.matchPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
