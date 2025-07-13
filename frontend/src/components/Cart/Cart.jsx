import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import { AuthContext } from '../AuthContext';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51ROnjfGvDejs31jxVNyMVwLRQY3yJTaXfAU61VHqiPLJDVVZ7l6g5YoipQiPNKUp0SrgoYFb2M0Sh7Km2o3Z06fa00fiDhQUHS');


const Cart = () => {
    const [cart, setCart] = useState(null);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        address: '',
        phoneNumber: '',
        deliveryInstructions: '',
    });
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // Fetch cart
    useEffect(() => {
        const fetchCart = async () => {
            try {
                if (!user) {
                    setError('Please log in to view your cart');
                    navigate('/login');
                    return;
                }
                console.log('Fetching cart for user:', user.id);
                const token = localStorage.getItem('token');
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/cart`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    const text = await response.text();
                    console.log(`GET /api/cart failed with status: ${response.status} ${response.statusText}`, 'Response:', text.slice(0, 200));
                    try {
                        const errorData = JSON.parse(text);
                        throw new Error(`Failed to fetch cart: ${errorData.message || response.statusText} (Status: ${response.status})`);
                    } catch (jsonErr) {
                        throw new Error(`Unexpected response: ${text.slice(0, 100)}... (Status: ${response.status} ${response.statusText})`);
                    }
                }
                const data = await response.json();
                // Validate cart items
                if (data.items.some(item => !item.productId || !item.productId.name)) {
                    console.error('Invalid cart items detected:', data.items);
                    setError('Cart contains invalid products. Please remove them and try again.');
                    return;
                }
                setCart(data);
                setError(null);
            } catch (err) {
                console.error('Fetch cart error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCart();
    }, [user, navigate]);

    // Update quantity
    const updateQuantity = async (productId, quantity) => {
        try {
            const token = localStorage.getItem('token');
            console.log('Sending PUT /api/cart/:productId:', { productId, quantity });
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/cart/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ quantity }),
            });
            if (!response.ok) {
                const text = await response.text();
                console.log(`PUT /api/cart/:productId failed with status: ${response.status} ${response.statusText}`, 'Response:', text.slice(0, 200));
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(`Error updating quantity: ${errorData.message || response.statusText} (Status: ${response.status})`);
                } catch (jsonErr) {
                    throw new Error(`Unexpected response: ${text.slice(0, 100)}... (Status: ${response.status} ${response.statusText})`);
                }
            }
            const updatedCart = await response.json();
            if (updatedCart.items.some(item => !item.productId || !item.productId.name)) {
                console.error('Invalid cart items after update:', updatedCart.items);
                setError('Cart contains invalid products. Please remove them and try again.');
                return;
            }
            setCart(updatedCart);
            setError(null);
        } catch (err) {
            console.error('Update quantity error:', err);
            setError(err.message);
        }
    };

    // Remove item
    const removeItem = async (productId) => {
        try {
            const token = localStorage.getItem('token');
            console.log('Sending DELETE /api/cart/:productId:', { productId });
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/cart/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const text = await response.text();
                // console.log(`DELETE /api/cart/:productId failed with status: ${response.status} ${response.statusText}`, 'Response:', text.slice(0, 200));
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(`Error removing item: ${errorData.message || response.statusText} (Status: ${response.status})`);
                } catch (jsonErr) {
                    throw new Error(`Unexpected response: ${text.slice(0, 100)}... (Status: ${response.status} ${response.statusText})`);
                }
            }
            const updatedCart = await response.json();
            if (updatedCart.items.some(item => !item.productId || !item.productId.name)) {
                console.error('Invalid cart items after removal:', updatedCart.items);
                setError('Cart contains invalid products. Please remove them and try again.');
                return;
            }
            setCart(updatedCart);
            setError(null);
        } catch (err) {
            console.error('Remove item error:', err);
            setError(err.message);
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle form submission
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!user) {
                setError('Please log in to proceed to checkout');
                navigate('/login');
                return;
            }
            if (!formData.fullName || !formData.address || !formData.phoneNumber) {
                setError('Please fill in all required fields');
                return;
            }
            if (cart.items.some(item => !item.productId || !item.productId.name)) {
                setError('Cart contains invalid products. Please remove them and try again.');
                return;
            }
            const token = localStorage.getItem('token');
            console.log('Sending POST /api/orders/send-checkout-email', { cartId: cart._id, ...formData });
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders/send-checkout-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ cartId: cart._id, ...formData }),
            });
            if (!response.ok) {
                const text = await response.text();
                console.log(`POST /api/orders/send-checkout-email failed with status: ${response.status} ${response.statusText}`, 'Response:', text.slice(0, 200));
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(`Error processing checkout: ${errorData.message || response.statusText} (Status: ${response.status})`);
                } catch (jsonErr) {
                    throw new Error(`Unexpected response: ${text.slice(0, 100)}... (Status: ${response.status} ${response.statusText})`);
                }
            }
            const data = await response.json();
            if (data.message.includes('email sending failed')) {
                setWarning(`Order placed, but failed to send email notification to admin: ${data.emailError || 'Unknown error'}. Please contact support.`);
            } else {
                setError(null);
            }
            setCart({ ...cart, items: [] });
            setShowModal(false);
            navigate('/success');
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err.message);
        }
    };


    // Open modal on checkout click
    const handleCheckout = () => {

        
        if (cart.items.some(item => !item.productId || !item.productId.name)) {
            setError('Cart contains invalid products. Please remove them and try again.');
            return;
        }
        setShowModal(true);
        setError(null);
        setWarning(null);
    };

    // Calculate total
    const calculateTotal = () => {
        if (!cart || !cart.items) return 0;
        return cart.items.reduce((sum, item) => {
            const amount = item.productId && item.productId.amount ? item.productId.amount : 0;
            return sum + amount * item.quantity;
        }, 0).toFixed(2);
        
    };


    const handleCheckoutByStripe = async () => {
        const stripe = await stripePromise;

        const totalAmount = calculateTotal();

        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payment/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: totalAmount }),
        });

        if (!res.ok) {
            console.error("Failed to create checkout session");
            return;
        }

        const session = await res.json();

        const result = await stripe.redirectToCheckout({
            sessionId: session.id,
        });

        if (result.error) {
            console.error(result.error.message);
        }
    };
    

    if (loading) return <div className="container mt-5"><p>Loading...</p></div>;
    if (error) return <div className="container mt-5"><div className="alert alert-danger">{error}</div></div>;
    if (!cart || cart.items.length === 0) return <div className="container mt-5"><p>Your cart is empty</p></div>;

    return (
        <div>
            {/* <Navbar /> */}
            <div style={{ height: '56px' }}></div>
            <div className="container mt-3">
                <h2>Your Cart</h2>
                {warning && <div className="alert alert-warning">{warning}</div>}
                <div className="table-responsive d-none d-md-block">
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Total</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {cart.items.map((item) => (
                            <tr key={item.productId._id}>
                            <td>{item.productId.name || 'Unknown Product'}</td>
                            <td>${(item.productId.amount || 0).toFixed(2)}</td>
                            <td>
                                <button
                                className="btn btn-outline-secondary btn-sm me-2"
                                onClick={() => updateQuantity(item.productId._id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                >
                                -
                                </button>
                                {item.quantity}
                                <button
                                className="btn btn-outline-secondary btn-sm ms-2"
                                onClick={() => updateQuantity(item.productId._id, item.quantity + 1)}
                                >
                                +
                                </button>
                            </td>
                            <td>${((item.productId.amount || 0) * item.quantity).toFixed(2)}</td>
                            <td>
                                <button
                                className="btn btn-danger btn-sm"
                                onClick={() => removeItem(item.productId._id)}
                                >
                                Remove
                                </button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                <div className="d-md-none">
                {cart.items.map((item) => (
                    <div key={item.productId._id} className="card mb-3">
                    <div className="card-body">
                        <div className='d-flex justify-content-between align-items-center'>
                            <h5 className="card-title">{item.productId.name || 'Unknown Product'}</h5>
                            <p className="card-text"><strong>Price:</strong> ${(item.productId.amount || 0).toFixed(2)}</p>
                        </div>
                        <div className='d-flex justify-content-between'>

                            <div className="card-text d-flex gap-2 align-items-center">
                            <strong>Quantity:</strong>
                            <div className="d-flex align-items-center mt-1">
                                <button
                                className="btn btn-outline-secondary btn-sm me-2"
                                onClick={() => updateQuantity(item.productId._id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                >
                                -
                                </button>
                                {item.quantity}
                                <button
                                className="btn btn-outline-secondary btn-sm ms-2"
                                onClick={() => updateQuantity(item.productId._id, item.quantity + 1)}
                                >
                                +
                                </button>
                            </div>
                            </div>
                            <p className="card-text"><strong>Total:</strong> ${((item.productId.amount || 0) * item.quantity).toFixed(2)}</p>
                        </div>
                        <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItem(item.productId._id)}
                        >
                        Remove
                        </button>
                    </div>
                    </div>
                ))}
                </div>


                <div className="mt-4">
                    <h4>Total: ${calculateTotal()}</h4>
                    <div className='d-flex gap-2'>

                        <button
                            className="btn btn-primary"
                            onClick={handleCheckout}
                        >
                            Proceed to Checkout
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={handleCheckoutByStripe}
                        >
                            Payment with Stripe
                        </button>
                    </div>
                </div>

                {/* Checkout Modal */}
                <div className={`modal fade ${showModal ? 'show d-block' : ''}`} tabIndex="-1" style={{ backgroundColor: showModal ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Checkout Details</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleFormSubmit}>
                                    <div className="mb-3">
                                        <label htmlFor="fullName" className="form-label">Full Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="fullName"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="address" className="form-label">Address</label>
                                        <textarea
                                            className="form-control"
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="form-control"
                                            id="phoneNumber"
                                            name="phoneNumber"
                                            value={formData.phoneNumber}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="deliveryInstructions" className="form-label">Delivery Instructions (optional)</label>
                                        <textarea
                                            className="form-control"
                                            id="deliveryInstructions"
                                            name="deliveryInstructions"
                                            value={formData.deliveryInstructions}
                                            onChange={handleInputChange}
                                        ></textarea>
                                    </div>
                                    <button type="submit" className="btn btn-primary">Submit</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;