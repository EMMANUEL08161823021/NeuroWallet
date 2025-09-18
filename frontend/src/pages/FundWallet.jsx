import { useState } from "react";
import axios from "axios";


const FundWallet = () => {
    const [amount, setAmount] = useState("");
    const [email, setEmail] = useState("");

    const handleFund = async () => {
        try {
        const token = localStorage.getItem("token"); // 👈 make sure you stored token after login

        const res = await axios.post(
            "http://localhost:9000/api/wallet/fund",
            { email, amount },
            {
            headers: {
                Authorization: `Bearer ${token}`, // 👈 correct format
            },
            }
        );

        console.log("Response", res);
        

        window.location.href = res.data.data.authorization_url;

        console.log(res.data);
        } catch (err) {
        console.error(err);
        }
    };

  return (
    <div>
      <h2>Fund Wallet (Sending Money to account)</h2>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
      <button onClick={handleFund}>Fund Wallet</button>
    </div>
  )
}

export default FundWallet;


