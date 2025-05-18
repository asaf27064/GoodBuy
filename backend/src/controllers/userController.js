const User = require('../Models/userModel');

// Copied directly from item controller, names of functions changed. TODO: implement functions.


exports.createUser = async (req, res) => {
    try {

    // Check if user already exists
    let user = await User.findOne({ username: req.body.username });
    if (user) return res.status(409).send('User already exists');

    // Hash the password
    const salt = await bcrypt.genSalt(10); // Taken from AP2 course, check what everything is later
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create new user
    newUser = new User({
        username: req.body.username,
        password: hashedPassword,
        email: req.body.email
    });
        await newUser.save();

    res.status(201).json(newUser);
    }
    
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
  

exports.getUser = async (req, res) => {

    try {

        const user = await User.findOne(req.params.username).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};