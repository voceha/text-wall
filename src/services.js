import { getServerConfig } from './config.js';

const { API_URL, WS_URL } = getServerConfig();

export const fetchInitialData = async () => {
    try {
        const response = await fetch(`${API_URL}/canvas`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch initial canvas data:", error);
        // Show user-friendly error
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to server. Make sure the server is running and accessible.');
        }
        throw error;
    }
};

export const createWebSocket = (userId, onMessage, onStatusChange) => {
    try {
        const socket = new WebSocket(`${WS_URL}/${userId}`);

        onStatusChange("Connecting");

        socket.onopen = () => {
            console.log("WebSocket connection established");
            onStatusChange("Connected");
        };

        socket.onmessage = event => {
            try {
                const message = JSON.parse(event.data);
                onMessage(message);
            } catch (parseError) {
                console.error("Failed to parse WebSocket message:", parseError);
            }
        };

        socket.onclose = event => {
            console.log("Disconnected from WebSocket server", event);
            if (event.code === 1006) {
                onStatusChange("Error");
                console.error("Connection failed - server might be unreachable");
            } else {
                onStatusChange("Disconnected");
            }
        };

        socket.onerror = error => {
            console.error("WebSocket error:", error);
            onStatusChange("Error");
        };

        return socket;
    } catch (error) {
        console.error("Failed to create WebSocket:", error);
        onStatusChange("Error");
        return null;
    }
};