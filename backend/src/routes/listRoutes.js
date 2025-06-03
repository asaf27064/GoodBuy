// File: routes/listRoutes.js

const express = require('express');
const router = express.Router();
const List = require('../Models/List');
const auth = require('../middleware/auth');

/**
 * POST /api/lists
 * Create a new List.
 * Expects in req.body:
 *   - name: String
 *   - members: [<userId>] (array of User ObjectIds; must include req.user._id at minimum)
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, members, items } = req.body;
    // Ensure current user is in members array
    const uniqueMembers = Array.from(new Set([req.user._id.toString(), ...(members || [])]));
    const newList = new List({
      name,
      members: uniqueMembers,
      items: items || [],
      isCart: false
    });
    await newList.save();
    return res.status(201).json({ list: newList });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PATCH /api/lists/:id
 * Update a List’s items or members.
 * Expects in req.body any of:
 *   - name
 *   - members (array)
 *   - items (array of { priceItemId, quantity })
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: 'List not found.' });

    // Verify current user is a member
    const isMember = list.members.some(id => id.equals(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Not authorized.' });

    // Update allowed fields
    const allowed = ['name', 'members', 'items'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        list[field] = req.body[field];
      }
    });
    await list.save();
    return res.json({ list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/lists/:id
 * Remove a List entirely.
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: 'List not found.' });

    // Verify current user is a member
    const isMember = list.members.some(id => id.equals(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Not authorized.' });

    await List.deleteOne({ _id: req.params.id });
    return res.json({ message: 'List deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/lists/:id
 * Retrieve a single List by ID.
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const list = await List.findById(req.params.id)
      .populate('items.priceItemId', 'itemName itemPrice')
      .lean();
    if (!list) return res.status(404).json({ message: 'List not found.' });

    // Verify current user is a member
    const isMember = list.members.some(id => id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not authorized.' });

    return res.json({ list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/lists
 * Retrieve all Lists for which the user is a member.
 */
router.get('/', auth, async (req, res) => {
  try {
    const lists = await List.find({ members: req.user._id })
      .populate('items.priceItemId', 'itemName itemPrice')
      .lean();
    return res.json({ lists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
