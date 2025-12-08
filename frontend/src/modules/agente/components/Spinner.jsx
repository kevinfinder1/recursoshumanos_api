const Spinner = ({ size = 'h-10 w-10', color = 'border-blue-600', text = 'Cargando...' }) => {
    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <div
                className={`animate-spin rounded-full border-b-2 mx-auto ${size} ${color}`}
                role="status"
            >
                <span className="sr-only">{text}</span>
            </div>
        </div>
    );
};

export default Spinner;

// Nota: Para que 'sr-only' funcione, necesitas tener esta clase en tu CSS global si no usas Tailwind:
/*
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}
*/
