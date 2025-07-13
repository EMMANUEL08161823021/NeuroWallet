import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
const Search = () => {
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const query = new URLSearchParams(location.search).get('q') || '';

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!query.trim()) {
                    setError('Please enter a search term');
                    setLoading(false);
                    return;
                }
                console.log('Fetching search results for query:', query);
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/products/search?q=${encodeURIComponent(query)}`);
                if (!response.ok) {
                    const text = await response.text();
                    console.log(`GET /api/products/search failed with status: ${response.status} ${response.statusText}`, 'Response:', text.slice(0, 200));
                    try {
                        const errorData = JSON.parse(text);
                        throw new Error(`Failed to fetch search results: ${errorData.message || response.statusText}`);
                    } catch (jsonErr) {
                        throw new Error(`Unexpected response: ${text.slice(0, 100)}...`);
                    }
                }
                const data = await response.json();
                setProducts(data);
            } catch (err) {
                console.error('Fetch search results error:', err);
                setError(err.message);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [query]);

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

    return (
        <div>
            {/* <Navbar /> */}
            <div style={{ height: '56px' }}></div>
            <div className="container mt-5">
                <h2>Search Results for "{query}"</h2>
                {loading && <p>Loading search results...</p>}
                {error && <div className="alert alert-danger">{error}</div>}
                {!loading && (
                    <div className="row">
                        {products.length === 0 ? (
                            <p>No products found</p>
                        ) : (
                            products.map((product) => (
                                <div className="col-6 col-md-3 mb-4" key={product._id}>
                                    <div className="card h-100">
                                        <img
                                            src={product.image || 'https://via.placeholder.com/150'}
                                            className="card-img-top"
                                            alt={product.name}
                                            style={{ height: '150px', objectFit: 'cover' }}
                                        />
                                        <div className="card-body">
                                            <h6 className="card-title">{product.name}</h6>
                                            <p className="card-text"><strong>${product.amount.toFixed(2)}</strong></p>
                                            <p className="card-text">{product.category}</p>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => addToCart(product._id)}
                                                disabled={loading}
                                            >
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;