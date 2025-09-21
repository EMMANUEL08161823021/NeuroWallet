import { useState } from "react";
import axios from "axios";


const FundWallet = ({email, bankName, accountNumber, amount}) => {
    // const [amount, setAmount] = useState("");
    // const [email, setEmail] = useState("");

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
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
        <p><strong>Confirm Transfer</strong></p>
        <p>Email: <span className="font-medium">{email || "Not found"}</span></p>
        <p>Bank: <span className="font-medium">{bankName}</span></p>
        <p>Account: <span className="font-medium">{accountNumber}</span></p>
        <p>Amount: <span className="font-medium">₦{amount}</span></p>
        <button onClick={handleFund}>Fund Wallet</button>
      </div>
    </div>
  )
}

export default FundWallet;


