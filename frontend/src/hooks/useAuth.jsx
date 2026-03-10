import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiLogin, apiLogout } from "../api/auth";
import { fetchPrecincts } from "../api/precincts";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [me, setMe] = useState(null);       // null = unknown, false = logged out
    const [busy, setBusy] = useState(true);    // true while checking session
    const navigate = useNavigate();
    const location = useLocation();

    // On mount, probe session by trying to fetch precincts (same as original logic)
    useEffect(() => {
        fetchPrecincts()
            .then(() => {
                setMe({ detail: "session ok" });
            })
            .catch(() => {
                setMe(false);
            })
            .finally(() => setBusy(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(async (username, password) => {
        setBusy(true);
        try {
            const data = await apiLogin(username, password);
            setMe(data);
            navigate("/precincts", { replace: true });
            return data;
        } finally {
            setBusy(false);
        }
    }, [navigate]);

    const logout = useCallback(async () => {
        setBusy(true);
        try {
            await apiLogout();
        } catch {
            // ignore
        }
        setMe(false);
        navigate("/login", { replace: true });
        setBusy(false);
    }, [navigate]);

    return (
        <AuthContext.Provider value={{ me, busy, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
