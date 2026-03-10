import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
    const { login, busy, me } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (me) {
            navigate("/precincts", { replace: true });
        }
    }, [me, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="card">
            <h2 className="cardTitle">Login</h2>
            {error && <div className="error">{error}</div>}
            <form className="form" onSubmit={handleSubmit}>
                <div>
                    <div className="label">Username</div>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                    />
                </div>
                <div>
                    <div className="label">Password</div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>
                <button className="btn primary" type="submit" disabled={busy}>
                    {busy ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}
