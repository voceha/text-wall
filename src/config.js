// Configuration for mobile access
// Update this with your computer's IP address when accessing from mobile

export const getServerConfig = () => {
    // For development, you can set your computer's IP here
    // Find your IP by running: ipconfig (Windows) or ifconfig (Mac/Linux)
    const MANUAL_SERVER_IP = process.env.REACT_APP_SERVER_IP

    if (MANUAL_SERVER_IP) {
        console.warn(`Using manual server IP: ${MANUAL_SERVER_IP}`)
        return {
            API_URL: `https://${MANUAL_SERVER_IP}/api`,
            WS_URL: `wss://${MANUAL_SERVER_IP}/ws`,
        }
    }

    // Auto-detect based on current hostname
    const hostname = window.location.hostname
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1"

    if (isLocalhost) {
        console.warn("Using localhost for API and WebSocket URLs")
        return {
            API_URL: "http://localhost:8000/api",
            WS_URL: "ws://localhost:8000/ws",
        }
    } else {
        console.warn(`Using hostname for API and WebSocket URLs: ${hostname}`)
        return {
            API_URL: `http://${hostname}:8000/api`,
            WS_URL: `ws://${hostname}:8000/ws`,
        }
    }
}

// Helper function to show current server info
export const getConnectionInfo = () => {
    const config = getServerConfig()
    return {
        apiUrl: config.API_URL,
        wsUrl: config.WS_URL,
        currentHostname: window.location.hostname,
        isLocalhost: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1",
    }
}
