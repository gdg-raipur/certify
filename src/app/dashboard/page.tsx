"use client"
import { useState } from "react";


//show all the certificates of an organisation and its details

export default function Dashboard() {
    const [orgId, setOrgId] = useState("");
    const [password, setPassword] = useState("");
    return (
        <div>
            <input type="text" placeholder="Organisation ID" />
            <input type="password" placeholder="Password" />
            <button>Submit</button>
            <h1>Dashboard</h1>
        </div>
    );
}