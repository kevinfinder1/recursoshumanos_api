import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";

const LoginPage = () => {
    const { login, user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // ✅ Redirigir si ya está autenticado - CORREGIDO
    useEffect(() => {
        if (isAuthenticated && user) {
            redirectUser(user);
        }
    }, [isAuthenticated, user, navigate]);

    const redirectUser = (userData) => {
        const userRole = userData.role?.toLowerCase().trim();

        // ✅ ORDEN CORRECTO: Primero admin, luego agente, luego usuario
        if (userData.is_superuser || userRole === "admin" || userRole === "administrador") {
            navigate("/admin", { replace: true });
            return;
        }

        // ✅ Roles de agente
        const rolesAgente = [
            "agente", "agente general",
            "agente_nomina", "agente de nómina",
            "agente_certificados", "agente de certificados",
            "agente_transporte", "agente de transporte",
            "agente_epps", "agente de epps",
            "agente_tca", "agente de tca"
        ];

        // ✅ Roles de usuario
        const rolesUsuario = ["solicitante", "usuario"];

        if (rolesAgente.includes(userRole)) {
            navigate("/agente", { replace: true });
        } else if (rolesUsuario.includes(userRole)) {
            navigate("/usuario", { replace: true });
        } else {
            // Rol no reconocido, ir a login
            navigate("/login", { replace: true });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const success = await login(username, password);

        if (success) {
            // La redirección se manejará en el useEffect
            console.log("✅ Login exitoso");
        } else {
            setError("Credenciales incorrectas o servidor no disponible.");
        }

        setLoading(false);
    };

    // Si ya está autenticado, mostrar loading
    if (isAuthenticated) {
        return (
            <div className="login-page-wrapper">
                <div className="flex justify-center items-center min-h-screen">
                    <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                        <p className="mt-4">Redirigiendo...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page-wrapper">
            <div className="bg-decoration circle1"></div>
            <div className="bg-decoration circle2"></div>
            <div className="bg-decoration circle3"></div>

            <div className="login-box">
                <div className="logo-section">
                    <div className="logo-swissport">
                        {/* ... (resto del código del login igual) ... */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 52" width="200" height="50">
                            <g id="logo-swissport" transform="translate(-8.000000, -1.000000)">
                                <path d="M110.674,31.587 C110.674,33.997 112.518,36.07 114.984,36.07 C117.411,36.07 119.296,33.958 119.296,31.586 C119.296,29.234 117.411,27.108 114.984,27.108 C112.501,27.108 110.674,29.182 110.674,31.586 M111.086,42.394 L111.086,50.882 L103.944,50.882 L103.944,21.665 L111.018,21.665 L110.97,23.725 C112.774,21.831 115.017,21.147 117.228,21.147 C123.242,21.147 126.55,26.057 126.55,31.655 C126.55,37.127 123.11,42.15 117.228,42.15 C114.72,42.15 112.71,41.492 111.018,39.566 C111.018,42.016 111.086,41.326 111.086,42.394 M144.352,31.696 C144.352,29.397 142.782,27.116 139.85,27.116 C137.121,27.116 135.333,28.741 135.333,31.616 C135.333,34.582 136.887,36.114 139.85,36.114 C142.638,36.114 144.352,34.204 144.352,31.696 M151.742,31.674 C151.742,38.488 146.292,42.364 139.85,42.364 C133.273,42.364 127.897,38.61 127.897,31.674 C127.897,24.412 133.273,20.878 139.85,20.878 C146.101,20.878 151.743,24.055 151.743,31.674 M23.778,21.854 C19.976,20.342 9.148,19.424 9.148,28.219 C9.148,29.664 10.141,33.49 15.104,33.641 C17.244,33.701 17.984,34.333 17.984,35.364 C17.984,36.44 15.557,38.169 10.527,35.009 L8.027,40.171 C17.653,45.11 25.263,40.961 25.111,34.806 C24.997,30.206 22.119,28.948 18.621,28.678 C16.537,28.508 16.266,27.604 16.341,27.144 C16.627,24.997 19.858,25.823 21.517,26.509 L23.777,21.854 L23.778,21.854 Z M24.698,21.687 L32.004,21.687 L34.505,31.127 L34.806,32.777 L35.114,31.149 L37.828,21.687 L45.012,21.687 L47.695,31.175 L48.011,32.88 L48.354,31.175 L50.972,21.687 L57.986,21.687 L51.275,41.669 L44.312,41.669 L41.524,31.695 L41.257,30.351 L40.982,31.673 L38.103,41.669 L31.283,41.669 L24.698,21.687 Z" fill="#FFFFFF" fillRule="nonzero" />
                                <polygon fill="#FFFFFF" fillRule="nonzero" points="59.021 41.668 66.034 41.668 66.034 21.687 59.021 21.687" />
                                <path d="M58.388,14.411 C58.388,12.134 60.237,10.281 62.473,10.281 C64.756,10.281 66.592,12.134 66.592,14.411 C66.592,16.694 64.756,18.547 62.473,18.547 C60.237,18.547 58.388,16.694 58.388,14.411" fill="#FFFFFF" fillRule="nonzero" />
                                <path d="M67.31,40.233 C76.959,45.182 84.64,41.041 84.481,34.88 C84.369,30.267 81.399,28.999 77.896,28.741 C75.828,28.577 75.562,27.655 75.631,27.204 C75.956,24.793 80.003,26.138 81.349,26.824 L83.669,22.088 C80.496,20.485 68.43,18.867 68.43,28.282 C68.43,29.735 69.427,33.55 74.385,33.702 C76.523,33.775 77.262,34.41 77.262,35.435 C77.262,36.499 74.826,38.245 69.795,35.087 L67.31,40.233 L67.31,40.233 Z M100.935,22.087 C97.772,20.486 85.571,18.907 85.571,28.331 C85.571,29.782 86.709,33.549 91.666,33.701 C93.796,33.776 94.534,34.41 94.534,35.434 C94.534,36.512 92.061,38.277 86.95,35.009 L84.423,40.148 C94.128,45.234 101.9,41.058 101.755,34.879 C101.635,30.266 98.675,28.998 95.16,28.741 C93.078,28.578 92.834,27.654 92.894,27.203 C93.221,24.793 97.267,26.139 98.614,26.823 L100.935,22.087 Z M182.924,27.594 L179.013,27.594 L179.013,41.659 L171.979,41.659 L171.979,27.594 L169.625,27.594 L169.625,21.731 L171.979,21.731 L171.979,15.427 L179.013,15.427 L179.013,21.731 L182.924,21.731 L182.924,27.594 Z M168.041,28.187 C167.315,27.89 166.244,27.743 165.475,27.743 C162.035,27.743 160.789,30.199 160.789,33.341 L160.789,41.62 L153.715,41.62 L153.715,21.637 L160.789,21.637 L160.789,24.047 C161.949,22.362 164.395,21.48 166.36,21.48 C166.924,21.48 167.493,21.538 168.041,21.637 L168.041,28.187 L168.041,28.187 Z" fill="#FFFFFF" fillRule="nonzero" />
                                <polygon fill="#D70F0A" fillRule="nonzero" points="219.235 50.882 181.765 50.882 209.944 1.919 248.264 1.919" />
                                <path d="M197.245,27.434 C198.672,29.491 206.054,31.104 214.775,30.626 C224.388,30.101 231.948,27.724 231.719,25.315 C231.628,24.345 230.299,23.51 228.129,22.878 C229.338,23.413 230.045,24.045 230.102,24.738 C230.289,27.106 222.822,29.3 213.42,29.642 C206.113,29.909 199.79,28.977 197.245,27.434" fill="#FFFFFE" fillRule="nonzero" />
                                <path d="M208.83,25.306 C209.616,18.224 212.497,12.382 215.496,11.075 C211.968,10.962 208.557,16.802 207.642,25.045 C206.753,33.065 208.852,39.906 212.345,40.468 C209.647,38.598 208.036,32.482 208.83,25.306" fill="#FFFFFE" fillRule="nonzero" />
                                <path d="M213.018,21.787 C219.813,21.183 225.355,22.392 227.107,24.529 C227.083,21.689 220.217,20.073 212.604,20.745 C204.914,21.423 198.849,24.258 198.928,27.106 C200.213,24.656 206.135,22.392 213.018,21.786" fill="#FFFFFE" fillRule="nonzero" />
                                <path d="M226.826,22.3 C225.641,17.932 220.338,14.607 216.244,16.26 C215.78,16.608 222.1,17.028 223.698,21.757 C225.736,27.774 222.261,33.455 216.748,34.259 C210.95,35.109 207.262,33.169 205.526,29.756 C204.18,27.128 204.702,24.998 204.216,26.326 C203.81,27.414 203.855,29.82 204.543,31.378 C206.875,36.66 212.33,38.781 218.705,37.037 C225.758,35.106 228.351,27.924 226.825,22.3 M212.46,17.42 C213.155,17.384 214.617,16.708 214.52,15.74 C214.463,15.214 212.443,15.249 210.97,15.83 C208.527,16.798 206.39,18.596 205.166,21.21 C208.413,18.005 209.037,17.598 212.46,17.42" fill="#FFFFFE" fillRule="nonzero" />
                                <path d="M214.58,7.194 C214.53,7.187 214.476,7.182 214.422,7.178 C217.171,8.808 218.9,16.473 218.372,25.378 C217.788,35.155 214.704,42.72 211.486,42.28 C210.456,42.138 209.538,41.197 208.786,39.667 C209.689,42.304 210.934,43.971 212.382,44.171 C215.804,44.641 219.066,36.741 219.674,26.531 C220.282,16.319 218.001,7.661 214.58,7.194" fill="#FFFFFE" fillRule="nonzero" />
                            </g>
                        </svg>
                    </div>
                    <h1>Bienvenido</h1>
                    <p className="subtitle">Ingresa a tu cuenta</p>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Usuario</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Tu nombre de usuario"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="options-row">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                disabled={loading}
                            />
                            <span>Recordarme</span>
                        </label>
                        <a href="#" className="link-forgot">
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>

                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? "Verificando..." : "Iniciar Sesión"}
                    </button>
                </form>

                <div className="signup-text">
                    ¿No tienes una cuenta? <a href="#">Regístrate</a>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;