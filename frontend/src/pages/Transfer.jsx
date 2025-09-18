import { useState } from "react";
import axios from "axios";



const Transfer = () => {

  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("");

  const handleTransfer = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:9000/api/wallet/transfer",
        { email: receiverEmail, amount: Number(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.msg + " | New balance: " + res.data.balance);
    } catch (err) {
      console.error(err);
      alert("Transfer failed");
    }
  };
  return (
    <div>
      <h2>Send Money</h2>
      <input placeholder="Receiver Email" value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} />
      <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
      <button onClick={handleTransfer}>Send</button>
    </div>
  )
}

export default Transfer;


