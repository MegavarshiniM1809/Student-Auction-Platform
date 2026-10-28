const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');

  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isDuplicateKeyError = (err) => err && err.code === 11000;

const handleServerError = (res, operation, err) => {
  console.error(`[Auth] ${operation} failed (${err.name || 'Error'}).`);
  return res.status(500).json({ message: 'An unexpected error occurred.' });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, department, year, contact } = req.body || {};
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof department !== 'string' ||
      year === undefined ||
      year === null
    ) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedDepartment = department.trim();
    const parsedYear = Number(year);

    if (!normalizedName || !normalizedDepartment || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide valid registration details.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 5) {
      return res.status(400).json({ message: 'Year must be an integer between 1 and 5.' });
    }
    if (contact !== undefined && typeof contact !== 'string') {
      return res.status(400).json({ message: 'Contact must be a string.' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication service is not configured.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      department: normalizedDepartment,
      year: parsedYear,
      contact: contact ? contact.trim() : '',
    });

    res.status(201).json({ token: generateToken(user._id), user });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please provide valid registration details.' });
    }
    return handleServerError(res, 'Registration', err);
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password)
      return res.status(400).json({ message: 'Email and password required.' });
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication service is not configured.' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });

    // Return user without passwordHash
    const userObj = user.toJSON();
    res.json({ token: generateToken(user._id), user: userObj });
  } catch (err) {
    return handleServerError(res, 'Login', err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// PATCH /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, department, year, contact, notificationPreference } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (department) updates.department = department;
    if (year) updates.year = Number(year);
    if (contact !== undefined) updates.contact = contact;
    if (notificationPreference) updates.notificationPreference = notificationPreference;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ user });
  } catch (err) {
    return handleServerError(res, 'Profile update', err);
  }
};

module.exports = { register, login, getMe, updateProfile };
