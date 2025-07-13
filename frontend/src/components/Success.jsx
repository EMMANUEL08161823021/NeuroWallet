import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar/Navbar';

const Success = () => {
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLatestOrder = async () => {
            try {
                // console.log('Fetching latest order');
                const token = localStorage.getItem('token');
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders/latest`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    const text = await response.text();
                    // console.log(`GET /api/orders/latest failed with status: ${response.status} ${response.statusText}`, 'Response:', text.slice(0, 200));
                    try {
                        const errorData = JSON.parse(text);
                        throw new Error(`Failed to fetch order: ${errorData.message || response.statusText} (Status: ${response.status})`);
                    } catch (jsonErr) {
                        throw new Error(`Non-JSON response: ${text.slice(0, 100)}... (Status: ${response.status} ${response.statusText})`);
                    }
                }
                const data = await response.json();
                setOrder(data);
                setError(null);
            } catch (err) {
                console.error('Fetch order error:', err);
                setError(err.message);
            }
        };
        fetchLatestOrder();
    }, []);

    return (
        <div>
            {/* <Navbar /> */}
            <div style={{ height: '56px' }}></div>
            <div className="container mt-5">
                <h2>Order Placed Successfully</h2>
                {error && <div className="alert alert-danger">{error}</div>}
                {order ? (
                    <div>
                        <p>Thank you for your order!</p>
                        <h4>Order Details</h4>
                        <p><strong>Order ID:</strong> {order._id}</p>
                        <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
                        <h5>Items:</h5>
                        <ul>
                            {order.items.map(item => (
                                <li key={item.productId._id}>
                                    {item.productId.name} - Quantity: {item.quantity} - ${item.price.toFixed(2)}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p>Loading order details...</p>
                )}
                <a href="/" className="btn btn-primary mt-3">Back to Home</a>
            </div>
        </div>
    );
};

export default Success;