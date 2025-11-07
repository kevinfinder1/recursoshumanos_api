import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const HomePage = () => {
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "admin") navigate("/admin");
    else if (role?.includes("agente")) navigate("/agent");
    else if (role === "usuario") navigate("/user");
    else navigate("/login");
  }, [role, navigate]);

  return <div>Cargando dashboard...</div>;
};

export default HomePage;
