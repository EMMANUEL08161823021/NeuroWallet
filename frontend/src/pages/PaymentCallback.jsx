// PaymentCallback.jsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";


const PaymentCallback = () => {

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const verifyPayment = async () => {
            const reference = searchParams.get("reference");
            const token = localStorage.getItem("token");

            try {
                const res = await axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/wallet/verify/${reference}`,
                {
                    headers: {
                    Authorization: `Bearer ${token}`,
                    },
                }
                );

                alert(res.data.msg);
                navigate("/dashboard");
            } catch (err) {
                alert(err.response?.data?.msg || "Verification failed");
                navigate("/dashboard");
            }
        };

        verifyPayment();
    }, [searchParams, navigate]);
    return (
        <p>Verifying your payment, please wait...</p>
    )
}

export default PaymentCallback;


