const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Create a transaction
router.post('/', async (req, res) => {
  const { sender, recipient, amount } = req.body;

  console.log('BODY:', req.body);
  console.log('Sender:', sender);
  console.log('Recipient:', recipient);
  console.log('Amount:', amount);

  if (!sender || !recipient || !amount) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const newTransaction = new Transaction({ sender, recipient, amount });
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Get transactions for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const transactions = await Transaction.find({ sender: userId }).sort({ date: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
