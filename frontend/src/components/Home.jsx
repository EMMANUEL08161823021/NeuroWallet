import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar/Navbar';
import { AuthContext } from './AuthContext';

const Home = () => {
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                console.log('Fetching all products');
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/products`);
                if (!response.ok) {
                    const text = await response.text();
                    console.log(`GET /api/products failed with status: ${response.status} ${response.statusText}`, 'Response:', text.slice(0, 200));
                    try {
                        const errorData = JSON.parse(text);
                        throw new Error(`Failed to fetch products: ${errorData.message || response.statusText}`);
                    } catch (jsonErr) {
                        throw new Error(`Unexpected response: ${text.slice(0, 100)}...`);
                    }
                }
                const data = await response.json();
                setProducts(data);
                setError(null);
            } catch (err) {
                console.error('Fetch products error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const addToCart = async (productId) => {
        try {
            if (!user) {
                setError('Please log in to add items to cart');
                navigate('/login');
                return;
            }
            const token = localStorage.getItem('token');
            console.log('Sending PUT /api/cart/:productId:', { productId, quantity: 1 });
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/cart/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ quantity: 1 }),
            });
            if (!response.ok) {
                const text = await response.text();
                console.log(`PUT /api/cart/:productId failed with status: ${response.status} ${response.statusText}`, 'Response:', text.slice(0, 200));
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(`Error adding to cart: ${errorData.message || response.statusText}`);
                } catch (jsonErr) {
                    throw new Error(`Unexpected response: ${text.slice(0, 100)}...`);
                }
            }
            setError(null);
            alert('Product added to cart');
        } catch (err) {
            console.error('Add to cart error:', err);
            setError(err.message);
        }
    };

    if (loading) return <div className="container mt-5"><p>Loading...</p></div>;
    if (error) return <div className="container mt-5"><div className="alert alert-danger">{error}</div></div>;

    return (
        <div>
            {/* <Navbar /> */}
            <div style={{ height: '56px' }}></div>
            <div className="container mt-5">
                <h2>Products</h2>
                {products.length === 0 ? (
                    <p>No products available</p>
                ) : (
                    <div className="row">
                        {products.map((product) => (
                            <div key={product._id} className="col-md-4 mb-4">
                                <div className="card h-100">
                                    <img src={product.image} className="card-img-top" alt={product.name} style={{ height: '200px', objectFit: 'cover' }} />
                                    <div className="card-body">
                                        <h5 className="card-title">{product.name}</h5>
                                        <p className="card-text"><strong>Category:</strong> {product.category}</p>
                                        <p className="card-text"><strong>Price:</strong> ${product.amount.toFixed(2)}</p>
                                        <p className="card-text"><strong>Weight:</strong> {product.weight}</p>
                                        <p className="card-text"><strong>Height:</strong> {product.height}</p>
                                        <p className="card-text"><strong>Battery:</strong> {product.battery}</p>
                                        <p className="card-text"><strong>Capacity:</strong> {product.capacity}</p>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => addToCart(product._id)}
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;