# WebRTC Video Chat Application

A real-time video conferencing web application built with React, Express, Socket.io and Peer.js, enabling seamless peer-to-peer communication with WebRTC.

# Tech Stack

- **Frontend**: React (with hooks for state management)
- **Backend**: Express.js (Node.js)
- **WebRTC Library**: Peer.js (simplifies peer connections)
- **Socket.io**: For real-time signaling and event handling

# How It Works

1) **User Joins a Room** – Enters an email/ID to create or join a session.
2) **Signaling via Socket.io** – Coordinates peer connections.
3) **WebRTC Handshake** – Establishes direct peer-to-peer streaming.
4) **Video and Audio Streaming** – Once connected, users can communicate in real time.
