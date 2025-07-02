const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Configure Nodemailer with SendGrid
const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: process.env.EMAIL_PASS,
    },
}));

// Get all orders (admin only)
router.get('/', auth, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        console.log('GET /api/orders:', { userId: req.user.userId });
        const orders = await Order.find().populate('userId items.productId');
        res.json(orders);
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get latest order for user
router.get('/latest', auth, async (req, res) => {
    try {
        console.log('GET /api/orders/latest:', { userId: req.user.userId });
        const order = await Order.findOne({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .populate('items.productId');
        if (!order) {
            return res.status(404).json({ message: 'No orders found' });
        }
        res.json(order);
    } catch (err) {
        console.error('Get latest order error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Send orders to admin email (admin only)
router.post('/send-email', auth, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        console.log('POST /api/orders/send-email:', { userId: req.user.userId });

        const orders = await Order.find().populate('userId items.productId');
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'No orders found' });
        }

        const orderList = orders.map(order => `
            <div style="margin-bottom: 20px;">
                <h3>Order ID: ${order._id}</h3>
                <p><strong>User:</strong> ${order.userId.email}</p>
                <p><strong>Full Name:</strong> ${order.fullName}</p>
                <p><strong>Address:</strong> ${order.address}</p>
                <p><strong>Phone Number:</strong> ${order.phoneNumber}</p>
                <p><strong>Delivery Instructions:</strong> ${order.deliveryInstructions || 'None'}</p>
                <p><strong>Total:</strong> $${(order.total || 0).toFixed(2)}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Created At:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                <h4>Items:</h4>
                <ul>
                    ${order.items.map(item => {
                        const productName = item.productId && item.productId.name ? item.productId.name : 'Unknown Product';
                        console.log('Order item:', { orderId: order._id, productId: item.productId ? item.productId._id : 'null', productName });
                        return `
                            <li>
                                ${productName} - Quantity: ${item.quantity} - $${(item.price || 0).toFixed(2)}
                            </li>
                        `;
                    }).join('')}
                </ul>
            </div>
        `).join('');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: 'GadgetShop Order Summary',
            html: `
                <h2>GadgetShop Order Summary</h2>
                <p>Below is the list of all orders in the system:</p>
                ${orderList}
                <p>Generated on: ${new Date().toLocaleString()}</p>
            `,
        };

        console.log('Attempting to send order summary email to:', process.env.ADMIN_EMAIL, 'from:', process.env.EMAIL_USER);
        await transporter.sendMail(mailOptions);
        console.log('Order summary email sent to:', process.env.ADMIN_EMAIL);
        res.json({ message: 'Order summary sent to admin email' });
    } catch (err) {
        console.error('Send email error:', { message: err.message, code: err.code, response: err.response ? err.response.body : 'No response body' });
        res.status(500).json({ message: 'Failed to send order summary: ' + err.message });
    }
});

// Send checkout email to admin
router.post('/send-checkout-email', auth, async (req, res) => {
    try {
        const { cartId, fullName, address, phoneNumber, deliveryInstructions } = req.body;
        console.log('POST /api/orders/send-checkout-email:', { cartId, userId: req.user.userId, fullName, address, phoneNumber, deliveryInstructions });

        // Validate form data
        if (!fullName || !address || !phoneNumber) {
            return res.status(400).json({ message: 'Full Name, Address, and Phone Number are required' });
        }

        // Fetch cart
        const cart = await Cart.findById(cartId).populate('items.productId');
        if (!cart || cart.userId.toString() !== req.user.userId) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        if (cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Validate cart items
        for (const item of cart.items) {
            if (!item.productId || typeof item.productId.amount !== 'number') {
                console.error('Invalid cart item:', { cartId, productId: item.productId ? item.productId._id : 'null', item });
                return res.status(400).json({ message: 'Invalid cart item: missing product or amount' });
            }
        }

        // Fetch user
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate total
        const total = cart.items.reduce((sum, item) => {
            const amount = item.productId.amount || 0;
            return sum + amount * item.quantity;
        }, 0);

        // Create order
        const order = new Order({
            userId: req.user.userId,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.amount || 0,
            })),
            total: total,
            status: 'completed',
            fullName,
            address,
            phoneNumber,
            deliveryInstructions: deliveryInstructions || '',
        });
        await order.save();

        // Format from name (use user.name if available, else email prefix)
        const fromName = user.name || user.email.split('@')[0];
        const fromAddress = `"${fromName}" <${process.env.EMAIL_USER}>`;

        // Fetch order with populated productId for email
        const populatedOrder = await Order.findById(order._id).populate('items.productId');

        // Format order as HTML
        const orderDetails = `
            <div style="margin-bottom: 20px;">
                <h3>Order ID: ${populatedOrder._id}</h3>
                <p><strong>User:</strong> ${user.email}</p>
                <p><strong>Full Name:</strong> ${populatedOrder.fullName}</p>
                <p><strong>Address:</strong> ${populatedOrder.address}</p>
                <p><strong>Phone Number:</strong> ${populatedOrder.phoneNumber}</p>
                <p><strong>Delivery Instructions:</strong> ${populatedOrder.deliveryInstructions || 'None'}</p>
                <p><strong>Total:</strong> $${(populatedOrder.total || 0).toFixed(2)}</p>
                <p><strong>Status:</strong> ${populatedOrder.status}</p>
                <p><strong>Created At:</strong> ${new Date(populatedOrder.createdAt).toLocaleString()}</p>
                <h4>Items:</h4>
                <ul>
                    ${populatedOrder.items.map(item => {
                        const productName = item.productId && item.productId.name ? item.productId.name : 'Unknown Product';
                        console.log('Checkout email item:', { orderId: populatedOrder._id, productId: item.productId ? item.productId._id : 'null', productName });
                        return `
                            <li>
                                ${productName} - Quantity: ${item.quantity} - $${(item.price || 0).toFixed(2)}
                            </li>
                        `;
                    }).join('')}
                </ul>
            </div>
        `;

        const mailOptions = {
            from: fromAddress,
            to: process.env.ADMIN_EMAIL,
            replyTo: user.email,
            subject: 'GadgetShop New Order Notification',
            html: `
                <h2>New Order Notification</h2>
                <p>A new order has been placed in GadgetShop:</p>
                ${orderDetails}
                <p>Generated on: ${new Date().toLocaleString()}</p>
            `,
        };

        // Send email (handle failure gracefully)
        let emailSent = false;
        let emailError = null;
        try {
            console.log('Attempting to send checkout email to:', process.env.ADMIN_EMAIL, 'from:', fromAddress, 'Reply-To:', user.email);
            await transporter.sendMail(mailOptions);
            console.log('Checkout email sent to:', process.env.ADMIN_EMAIL, 'from:', fromAddress, 'Reply-To:', user.email);
            emailSent = true;
        } catch (emailErr) {
            emailError = {
                message: emailErr.message,
                code: emailErr.code,
                response: emailErr.response ? emailErr.response.body : 'No response body',
            };
            console.error('Failed to send checkout email:', emailError);
        }

        // Clear cart
        cart.items = [];
        await cart.save();

        res.json({ 
            message: emailSent 
                ? 'Order created and email sent to admin' 
                : 'Order created, but email sending failed',
            orderId: order._id,
            emailError: emailError ? emailError.message : null,
        });
    } catch (err) {
        console.error('Send checkout email error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;