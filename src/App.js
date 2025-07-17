import React, { useEffect, useState, useRef } from "react"
import PropTypes from "prop-types"
import { fetchInitialData, createWebSocket } from "./services"
import { getConnectionInfo } from "./config.js"

const App = () => {
    const [matrix, setMatrix] = useState([])
    const [cursor, setCursor] = useState({ row: 0, col: 0 })
    const [ws, setWs] = useState(null)
    const [otherCursors, setOtherCursors] = useState({})
    const [isMobile, setIsMobile] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState("Disconnected")
    const textareaRef = useRef(null)

    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showDebug, setShowDebug] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => {
            const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent
            const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
            setIsMobile(mobileRegex.test(userAgent))
        }
        checkIsMobile()

        const loadInitialData = async () => {
            try {
                setIsLoading(true)
                setError(null)
                const data = await fetchInitialData()
                const newMatrix = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ""))
                data.forEach(entry => {
                    if (newMatrix[entry.x] && newMatrix[entry.x][entry.y] !== undefined) {
                        newMatrix[entry.x][entry.y] = entry.letter
                    }
                })
                setMatrix(newMatrix)
            } catch (err) {
                console.error("Failed to load initial data:", err)
                setError(err.message || "Failed to load data from server")
            } finally {
                setIsLoading(false)
            }
        }
        loadInitialData()
    }, [])

    useEffect(() => {
        const userId = Math.floor(Math.random() * 1000)
        const socket = createWebSocket(
            userId,
            message => {
                if (message.type === "update") {
                    setMatrix(prevMatrix => {
                        const newMatrix = [...prevMatrix]
                        if (newMatrix[message.row]) {
                            newMatrix[message.row][message.col] = message.value
                        }
                        return newMatrix
                    })
                } else if (message.type === "cursor") {
                    if (message.userId) {
                        setOtherCursors(prev => ({ ...prev, [message.userId]: { row: message.row, col: message.col } }))
                    }
                }
            },
            setConnectionStatus
        )
        setWs(socket)

        return () => {
            if (socket) {
                socket.close()
            }
        }
    }, [])

    const handleCellClick = (rowIndex, colIndex) => {
        setCursor({ row: rowIndex, col: colIndex })
    }

    useEffect(() => {
        const handleKeyDown = e => {
            if (e.ctrlKey || e.metaKey || e.altKey) return

            e.preventDefault()

            setCursor(prevCursor => {
                let { row, col } = prevCursor
                let newCursor = { ...prevCursor }

                if (e.key.length === 1) {
                    setMatrix(prevMatrix => {
                        const newMatrix = [...prevMatrix]
                        newMatrix[row][col] = e.key
                        if (ws) ws.send(JSON.stringify({ type: "update", row, col, value: e.key }))
                        return newMatrix
                    })
                    newCursor = { row, col: Math.min(matrix[0].length - 1, col + 1) }
                } else {
                    switch (e.key) {
                        case "ArrowUp":
                            newCursor = { ...prevCursor, row: Math.max(0, row - 1) }
                            break
                        case "ArrowDown":
                            newCursor = { ...prevCursor, row: Math.min(matrix.length - 1, row + 1) }
                            break
                        case "ArrowLeft":
                            newCursor = { ...prevCursor, col: Math.max(0, col - 1) }
                            break
                        case "ArrowRight":
                            newCursor = { ...prevCursor, col: Math.min(matrix[0].length - 1, col + 1) }
                            break
                        case "Enter":
                            newCursor = { row: Math.min(matrix.length - 1, row + 1), col: 0 }
                            break
                        case "Tab":
                            newCursor = { ...prevCursor, col: Math.min(matrix[0].length - 1, col + 4) }
                            break
                        case "Backspace":
                            if (col > 0) {
                                setMatrix(prevMatrix => {
                                    const newMatrix = [...prevMatrix]
                                    newMatrix[row][col - 1] = ""
                                    if (ws) ws.send(JSON.stringify({ type: "update", row, col: col - 1, value: "" }))
                                    return newMatrix
                                })
                                newCursor = { ...prevCursor, col: col - 1 }
                            }
                            break
                        default:
                            break
                    }
                }

                if (ws) ws.send(JSON.stringify({ type: "cursor", row: newCursor.row, col: newCursor.col }))
                return newCursor
            })
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [matrix, ws])

    const handleMobileInput = e => {
        const text = e.target.value
        if (text.length > 0) {
            const lastChar = text.slice(-1)
            e.target.value = ""

            setCursor(prevCursor => {
                let { row, col } = prevCursor
                setMatrix(prevMatrix => {
                    const newMatrix = [...prevMatrix]
                    if (newMatrix[row]) {
                        newMatrix[row][col] = lastChar
                        if (ws) ws.send(JSON.stringify({ type: "update", row, col, value: lastChar }))
                    }
                    return newMatrix
                })
                const newCursor = { row, col: Math.min(matrix[0].length - 1, col + 1) }
                if (ws) ws.send(JSON.stringify({ type: "cursor", row: newCursor.row, col: newCursor.col }))
                return newCursor
            })
        }
    }

    return (
        <div style={{ padding: '20px', maxWidth: '100%', overflow: 'hidden' }}>
            <h1>Collaborative Text Matrix</h1>
            
            {error && (
                <div style={{
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    color: '#721c24'
                }}>
                    <strong>Error:</strong> {error}
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>
                        Make sure your server is running and accessible from this device
                    </div>
                </div>
            )}
            
            {isLoading && !error && (
                <div style={{
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: '4px',
                    color: '#0c5460'
                }}>
                    Loading matrix data...
                </div>
            )}
            
            <div style={{
                padding: '10px',
                marginBottom: '10px',
                backgroundColor: connectionStatus === 'Connected' ? '#d4edda' :
                               connectionStatus === 'Error' ? '#f8d7da' :
                               connectionStatus === 'Connecting' ? '#fff3cd' : '#f8f9fa',
                border: `1px solid ${connectionStatus === 'Connected' ? '#c3e6cb' :
                                     connectionStatus === 'Error' ? '#f5c6cb' :
                                     connectionStatus === 'Connecting' ? '#ffeaa7' : '#dee2e6'}`,
                borderRadius: '4px',
                color: connectionStatus === 'Connected' ? '#155724' :
                       connectionStatus === 'Error' ? '#721c24' :
                       connectionStatus === 'Connecting' ? '#856404' : '#6c757d'
            }}>
                <strong>Connection Status:</strong> {connectionStatus}
                {connectionStatus === 'Disconnected' && (
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>
                        Make sure you're connected to the same network as the server
                    </div>
                )}
                {connectionStatus === 'Error' && (
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>
                        Check if the server is running and accessible
                    </div>
                )}
            </div>
            
            {!isLoading && !error && (
                <>
                    {isMobile && (
                        <button onClick={() => textareaRef.current && textareaRef.current.focus()}>
                            Type
                        </button>
                    )}
                    <MatrixCanvas matrix={matrix} onCellClick={handleCellClick} cursor={cursor} otherCursors={otherCursors} />
                    {isMobile && (
                        <textarea
                            ref={textareaRef}
                            style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0 }}
                            onChange={handleMobileInput}
                        />
                    )}
                </>
            )}
            
            <button
                onClick={() => setShowDebug(!showDebug)}
                style={{
                    position: 'fixed',
                    bottom: '10px',
                    right: '10px',
                    fontSize: '12px',
                    padding: '5px 10px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '3px'
                }}
            >
                {showDebug ? 'Hide' : 'Show'} Debug
            </button>
            
            {showDebug && (
                <div style={{
                    position: 'fixed',
                    bottom: '40px',
                    right: '10px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    padding: '10px',
                    fontSize: '12px',
                    maxWidth: '300px',
                    zIndex: 1000
                }}>
                    <h4 style={{ margin: '0 0 5px 0' }}>Debug Info</h4>
                    <div><strong>Current Host:</strong> {getConnectionInfo().currentHostname}</div>
                    <div><strong>API URL:</strong> {getConnectionInfo().apiUrl}</div>
                    <div><strong>WS URL:</strong> {getConnectionInfo().wsUrl}</div>
                    <div><strong>Is Mobile:</strong> {isMobile ? 'Yes' : 'No'}</div>
                    <div><strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...</div>
                    <div style={{ marginTop: '5px', fontSize: '11px', color: '#6c757d' }}>
                        Tip: If on mobile, make sure you're using your computer's IP address instead of localhost
                    </div>
                </div>
            )}
        </div>
    )
}

export default App

const MatrixCanvas = ({ matrix, onCellClick, cursor, otherCursors }) => {
    const canvasRef = useRef(null)

    const handleCanvasClick = e => {
        if (!canvasRef.current) return

        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const charElement = canvasRef.current.querySelector("span")
        const rowElement = canvasRef.current.querySelector("div")

        if (charElement && rowElement) {
            const charWidth = charElement.offsetWidth
            const lineHeight = rowElement.offsetHeight

            const row = Math.floor(y / lineHeight)
            const col = Math.floor(x / charWidth)

            onCellClick(row, col)
        }
    }

    const getCursorColor = userId => {
        let hash = 0
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash)
        }
        const c = (hash & 0x00ffffff).toString(16).toUpperCase()
        return "#" + "00000".substring(0, 6 - c.length) + c
    }

    return (
        <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", border: "1px solid #ccc", padding: "10px", cursor: "text", position: "relative" }}>
            {Object.entries(otherCursors).map(([userId, pos]) => (
                <div
                    key={userId}
                    style={{
                        position: "absolute",
                        left: `${pos.col * 0.6}em`,
                        top: `${pos.row * 1.2}em`,
                        width: "2px",
                        height: "1.2em",
                        backgroundColor: getCursorColor(userId),
                    }}
                />
            ))}
            {matrix.map((row, rowIndex) => (
                <div key={rowIndex} style={{ lineHeight: "1.2em" }}>
                    {row.map((cell, colIndex) => (
                        <span
                            key={`${rowIndex}-${colIndex}`}
                            style={{
                                display: "inline-block",
                                minWidth: "0.6em",
                                backgroundColor: cursor.row === rowIndex && cursor.col === colIndex ? "lightblue" : "transparent",
                            }}>
                            {cell || " "}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    )
}

MatrixCanvas.propTypes = {
    matrix: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
    onCellClick: PropTypes.func.isRequired,
    cursor: PropTypes.shape({
        row: PropTypes.number.isRequired,
        col: PropTypes.number.isRequired,
    }).isRequired,
    otherCursors: PropTypes.object.isRequired,
}
